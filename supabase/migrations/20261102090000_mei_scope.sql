-- Forge Finance: Fase 1 do MEI — escopo Pessoal x Empresa.
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.

-- =====================================================
-- 1) COLUNA SCOPE (tudo que já existe fica 'personal')
-- =====================================================

do $$
declare
  t text;
begin
  foreach t in array array['accounts', 'transactions', 'categories', 'goals', 'investments', 'cards'] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    -- "not null default" preenche as linhas existentes com 'personal' (backfill).
    execute format(
      'alter table public.%I add column if not exists scope text not null default %L',
      t, 'personal'
    );

    if not exists (
      select 1 from pg_constraint
       where conname = t || '_scope_check'
         and conrelid = ('public.' || t)::regclass
    ) then
      execute format(
        'alter table public.%I add constraint %I check (scope in (''personal'', ''business''))',
        t, t || '_scope_check'
      );
    end if;

    execute format(
      'create index if not exists %I on public.%I (user_id, scope)',
      t || '_user_scope_idx', t
    );
  end loop;
end;
$$;

-- =====================================================
-- 2) TRANSAÇÃO SEMPRE NO ESCOPO DA CONTA
-- Vale para o app, para o bot do WhatsApp e para funções antigas.
-- =====================================================

create or replace function public.ff_transactions_scope_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_account_scope text;
  v_category_scope text;
begin
  if new.account_id is not null then
    select a.scope into v_account_scope
      from public.accounts a
     where a.id = new.account_id
       and a.user_id = new.user_id;

    if not found then
      raise exception 'Conta inválida para esta transação.' using errcode = '23514';
    end if;

    new.scope := v_account_scope;
  end if;

  if new.category_id is not null then
    select c.scope into v_category_scope
      from public.categories c
     where c.id = new.category_id
       and c.user_id = new.user_id;

    if not found then
      raise exception 'Categoria inválida para esta transação.' using errcode = '23514';
    end if;

    if v_category_scope <> new.scope then
      raise exception 'A categoria e a conta pertencem a escopos diferentes (Pessoal/Empresa).'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_scope_guard on public.transactions;
create trigger trg_transactions_scope_guard
before insert or update of account_id, category_id, scope, user_id on public.transactions
for each row execute function public.ff_transactions_scope_guard();

-- Conta/categoria com transações não pode trocar de escopo (evita misturar dados).
create or replace function public.ff_lock_scope_with_transactions()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.scope is distinct from old.scope then
    if tg_table_name = 'accounts' and exists (
      select 1 from public.transactions t where t.account_id = old.id
    ) then
      raise exception 'Esta conta já tem transações e não pode mudar de escopo.' using errcode = '23514';
    end if;

    if tg_table_name = 'categories' and exists (
      select 1 from public.transactions t where t.category_id = old.id
    ) then
      raise exception 'Esta categoria já tem transações e não pode mudar de escopo.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_accounts_scope_lock on public.accounts;
create trigger trg_accounts_scope_lock
before update of scope on public.accounts
for each row execute function public.ff_lock_scope_with_transactions();

drop trigger if exists trg_categories_scope_lock on public.categories;
create trigger trg_categories_scope_lock
before update of scope on public.categories
for each row execute function public.ff_lock_scope_with_transactions();

-- =====================================================
-- 3) REGRA ÚNICA DE TRANSAÇÃO + SALDO (atômica)
-- Usada pelo app, por contas a pagar/receber e pelo DAS.
-- SECURITY INVOKER: a RLS do usuário continua valendo.
-- =====================================================

create or replace function public.ff_create_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_type text,
  p_title text,
  p_description text,
  p_amount numeric,
  p_date date
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_amount numeric(14,2) := round(p_amount, 2);
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_type is null or p_type not in ('income', 'expense') then
    raise exception 'Tipo de transação inválido.' using errcode = '22023';
  end if;

  if v_amount is null or v_amount <= 0 then
    raise exception 'O valor deve ser maior que zero.' using errcode = '22023';
  end if;

  if p_date is null then
    raise exception 'Informe uma data válida.' using errcode = '22023';
  end if;

  if p_account_id is null then
    raise exception 'Escolha uma conta.' using errcode = '22023';
  end if;

  insert into public.transactions (
    user_id, account_id, category_id, type, title, description, amount, transaction_date
  )
  values (
    v_user, p_account_id, p_category_id, p_type,
    coalesce(nullif(trim(p_title), ''), 'Sem descrição'),
    p_description, v_amount, p_date
  )
  returning id into v_id;

  update public.accounts
     set current_balance = coalesce(current_balance, 0)
       + case when p_type = 'income' then v_amount else -v_amount end
   where id = p_account_id
     and user_id = v_user;

  if not found then
    raise exception 'Conta não encontrada.' using errcode = '23514';
  end if;

  return v_id;
end;
$$;

create or replace function public.ff_delete_transaction(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions%rowtype;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  select * into v_tx
    from public.transactions
   where id = p_id
     and user_id = v_user
   for update;

  if not found then
    raise exception 'Transação não encontrada.' using errcode = '23514';
  end if;

  if v_tx.account_id is not null then
    update public.accounts
       set current_balance = coalesce(current_balance, 0)
         - case when v_tx.type = 'income' then v_tx.amount else -v_tx.amount end
     where id = v_tx.account_id
       and user_id = v_user;
  end if;

  delete from public.transactions where id = v_tx.id;
end;
$$;

revoke all on function public.ff_create_transaction(uuid, uuid, text, text, text, numeric, date) from public, anon;
grant execute on function public.ff_create_transaction(uuid, uuid, text, text, text, numeric, date) to authenticated;

revoke all on function public.ff_delete_transaction(uuid) from public, anon;
grant execute on function public.ff_delete_transaction(uuid) to authenticated;

-- =====================================================
-- 4) PADRÕES DA EMPRESA (só roda quando o usuário aceita)
-- =====================================================

create or replace function public.ff_seed_business_defaults(p_create_account boolean default true)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  insert into public.categories (user_id, name, type, color, icon, scope)
  select v_user, d.name, d.type, d.color, d.icon, 'business'
    from (values
      ('Vendas',                'income',  '#22C55E', '🛒'),
      ('Serviços prestados',    'income',  '#10B981', '🛠️'),
      ('Outros',                'income',  '#6EE7B7', '💰'),
      ('Fornecedores',          'expense', '#F97316', '📦'),
      ('Marketing',             'expense', '#EC4899', '📣'),
      ('Ferramentas e software','expense', '#3B82F6', '💻'),
      ('Impostos',              'expense', '#EF4444', '🧾'),
      ('Pró-labore',            'expense', '#8B5CF6', '👤'),
      ('Equipamentos',          'expense', '#64748B', '🖨️'),
      ('Outros',                'expense', '#71717A', '📁')
    ) as d(name, type, color, icon)
   where not exists (
     select 1 from public.categories c
      where c.user_id = v_user
        and c.scope = 'business'
        and c.type = d.type
        and lower(c.name) = lower(d.name)
   );

  if p_create_account and not exists (
    select 1 from public.accounts a
     where a.user_id = v_user
       and a.scope = 'business'
       and lower(a.name) = lower('Caixa da empresa')
  ) then
    insert into public.accounts (user_id, name, type, color, initial_balance, current_balance, scope)
    values (v_user, 'Caixa da empresa', 'Carteira', '#F59E0B', 0, 0, 'business');
  end if;
end;
$$;

revoke all on function public.ff_seed_business_defaults(boolean) from public, anon;
grant execute on function public.ff_seed_business_defaults(boolean) to authenticated;
