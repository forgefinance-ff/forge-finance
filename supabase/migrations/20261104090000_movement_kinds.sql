-- =====================================================
-- Aportes, empréstimos e reembolsos + mais categorias da Empresa
--
-- Cada categoria ganha uma "natureza" (kind):
--   regular      -> receita/despesa normal (entra nos relatórios de resultado)
--   contribution -> aporte (dinheiro colocado/retirado pelo dono ou sócios)
--   loan         -> empréstimo (recebido, pago, concedido)
--   refund       -> reembolso (recebido ou pago)
--
-- Aporte, empréstimo e reembolso mexem no saldo das contas, mas NÃO contam
-- como receita/despesa nem como faturamento do MEI.
-- A transação copia a natureza da categoria (gatilho abaixo), para os
-- relatórios filtrarem sem precisar de join.
-- =====================================================

alter table public.categories
  add column if not exists kind text not null default 'regular';

alter table public.categories
  drop constraint if exists categories_kind_check;

alter table public.categories
  add constraint categories_kind_check
  check (kind in ('regular', 'contribution', 'loan', 'refund'));

alter table public.transactions
  add column if not exists kind text not null default 'regular';

alter table public.transactions
  drop constraint if exists transactions_kind_check;

alter table public.transactions
  add constraint transactions_kind_check
  check (kind in ('regular', 'contribution', 'loan', 'refund'));

create index if not exists transactions_user_scope_kind_idx
  on public.transactions (user_id, scope, kind);

-- A transação herda a natureza da categoria.
create or replace function public.ff_transaction_kind_from_category()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.category_id is null then
    new.kind := 'regular';
  else
    select coalesce(c.kind, 'regular')
      into new.kind
      from public.categories c
     where c.id = new.category_id;

    if new.kind is null then
      new.kind := 'regular';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_kind on public.transactions;
create trigger trg_transactions_kind
before insert or update of category_id on public.transactions
for each row execute function public.ff_transaction_kind_from_category();

-- Se a natureza de uma categoria mudar, as transações dela acompanham.
create or replace function public.ff_sync_transaction_kind()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.kind is distinct from old.kind then
    update public.transactions
       set kind = new.kind
     where category_id = new.id
       and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_kind_sync on public.categories;
create trigger trg_categories_kind_sync
after update of kind on public.categories
for each row execute function public.ff_sync_transaction_kind();

-- =====================================================
-- Categorias especiais (aporte/empréstimo/reembolso) de um escopo.
-- Mesmo nome na entrada e na saída: o tipo (entrada/saída) diferencia.
-- =====================================================

create or replace function public.ff_ensure_special_categories(p_scope text)
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

  if p_scope not in ('personal', 'business') then
    raise exception 'Escopo inválido.' using errcode = '22023';
  end if;

  insert into public.categories (user_id, name, type, color, icon, scope, kind)
  select v_user, d.name, d.type, d.color, d.icon, p_scope, d.kind
    from (values
      ('Aportes',      'income',  '#14B8A6', '🏦', 'contribution'),
      ('Aportes',      'expense', '#0D9488', '🏦', 'contribution'),
      ('Empréstimos',  'income',  '#6366F1', '🤝', 'loan'),
      ('Empréstimos',  'expense', '#4F46E5', '🤝', 'loan'),
      ('Reembolsos',   'income',  '#22D3EE', '↩️', 'refund'),
      ('Reembolsos',   'expense', '#06B6D4', '↩️', 'refund')
    ) as d(name, type, color, icon, kind)
   where not exists (
     select 1 from public.categories c
      where c.user_id = v_user
        and c.scope = p_scope
        and c.type = d.type
        and c.kind = d.kind
   );
end;
$$;

revoke all on function public.ff_ensure_special_categories(text) from public, anon;
grant execute on function public.ff_ensure_special_categories(text) to authenticated;

-- =====================================================
-- Padrões da Empresa: mais categorias (só adiciona as que faltam).
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
      ('Vendas',                      'income',  '#22C55E', '🛒'),
      ('Serviços prestados',          'income',  '#10B981', '🛠️'),
      ('Comissões',                   'income',  '#34D399', '🤑'),
      ('Rendimentos financeiros',     'income',  '#2DD4BF', '📈'),
      ('Outros',                      'income',  '#6EE7B7', '💰'),
      ('Fornecedores',                'expense', '#F97316', '📦'),
      ('Matéria-prima e insumos',     'expense', '#FB923C', '🧵'),
      ('Embalagens',                  'expense', '#FDBA74', '🎁'),
      ('Marketing',                   'expense', '#EC4899', '📣'),
      ('Anúncios online',             'expense', '#F472B6', '📱'),
      ('Ferramentas e software',      'expense', '#3B82F6', '💻'),
      ('Impostos',                    'expense', '#EF4444', '🧾'),
      ('Contabilidade',               'expense', '#F87171', '📊'),
      ('Taxas bancárias e maquininha','expense', '#94A3B8', '💳'),
      ('Pró-labore',                  'expense', '#8B5CF6', '👤'),
      ('Salários e freelancers',      'expense', '#A78BFA', '👥'),
      ('Aluguel',                     'expense', '#7C3AED', '🏢'),
      ('Água, luz e internet',        'expense', '#0EA5E9', '💡'),
      ('Telefone',                    'expense', '#38BDF8', '☎️'),
      ('Frete e entregas',            'expense', '#F59E0B', '🚚'),
      ('Transporte',                  'expense', '#3B82F6', '🚗'),
      ('Alimentação',                 'expense', '#FB7185', '🍽️'),
      ('Manutenção',                  'expense', '#78716C', '🔧'),
      ('Equipamentos',                'expense', '#64748B', '🖨️'),
      ('Cursos e capacitação',        'expense', '#06B6D4', '🎓'),
      ('Outros',                      'expense', '#71717A', '📁')
    ) as d(name, type, color, icon)
   where not exists (
     select 1 from public.categories c
      where c.user_id = v_user
        and c.scope = 'business'
        and c.type = d.type
        and lower(c.name) = lower(d.name)
   );

  perform public.ff_ensure_special_categories('business');

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
