-- Forge Finance: Fase 3 do MEI — contas a pagar e a receber.
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Depende das Fases 1 (scope, ff_create_transaction) e 2 (customers).

-- =====================================================
-- 1) TABELA
-- =====================================================

create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'personal' check (scope in ('personal', 'business')),
  kind text not null check (kind in ('payable', 'receivable')),
  description text not null check (length(trim(description)) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'canceled')),
  paid_at date,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  -- Cliente com cobranças não pode ser apagado (só arquivado).
  customer_id uuid references public.customers(id) on delete restrict,
  recurrence text not null default 'none' check (recurrence in ('none', 'monthly')),
  -- Dia original do vencimento, para a recorrência não "escorregar" depois de fevereiro.
  recurrence_day smallint check (recurrence_day between 1 and 31),
  -- Conta que gerou esta (recorrência). Único: a próxima só é gerada uma vez.
  parent_id uuid references public.payables(id) on delete set null,
  -- Transação criada ao marcar como pago/recebido.
  transaction_id uuid references public.transactions(id) on delete set null,
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  constraint payables_customer_only_receivable
    check (customer_id is null or (kind = 'receivable' and scope = 'business')),
  constraint payables_paid_has_date
    check (status <> 'paid' or paid_at is not null)
);

create unique index if not exists payables_parent_unique
  on public.payables (parent_id) where parent_id is not null;

create index if not exists payables_user_scope_idx
  on public.payables (user_id, scope, kind, status, due_date);

create index if not exists payables_customer_idx
  on public.payables (customer_id) where customer_id is not null;

alter table public.payables enable row level security;

drop policy if exists "payables_own" on public.payables;
create policy "payables_own"
  on public.payables
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================
-- 2) CONTA, CATEGORIA E CLIENTE NO MESMO ESCOPO (e do mesmo usuário)
-- =====================================================

create or replace function public.ff_payables_scope_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_scope text;
  v_type text;
  v_expected_type text;
begin
  if new.account_id is not null then
    select a.scope into v_scope
      from public.accounts a
     where a.id = new.account_id and a.user_id = new.user_id;

    if not found then
      raise exception 'Conta inválida.' using errcode = '23514';
    end if;
    if v_scope <> new.scope then
      raise exception 'A conta escolhida é de outro escopo (Pessoal/Empresa).' using errcode = '23514';
    end if;
  end if;

  if new.category_id is not null then
    select c.scope, c.type into v_scope, v_type
      from public.categories c
     where c.id = new.category_id and c.user_id = new.user_id;

    if not found then
      raise exception 'Categoria inválida.' using errcode = '23514';
    end if;
    if v_scope <> new.scope then
      raise exception 'A categoria escolhida é de outro escopo (Pessoal/Empresa).' using errcode = '23514';
    end if;
    -- Calculado antes do IF: no PL/pgSQL o "then" de um CASE dentro da
    -- condição do IF encerra a condição antes da hora.
    v_expected_type := case when new.kind = 'payable' then 'expense' else 'income' end;

    if v_type <> v_expected_type then
      raise exception 'Use uma categoria de despesa para contas a pagar e de receita para contas a receber.'
        using errcode = '23514';
    end if;
  end if;

  if new.customer_id is not null and not exists (
    select 1 from public.customers cu
     where cu.id = new.customer_id and cu.user_id = new.user_id
  ) then
    raise exception 'Cliente inválido.' using errcode = '23514';
  end if;

  if new.recurrence = 'monthly' and new.recurrence_day is null then
    new.recurrence_day := extract(day from new.due_date)::smallint;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payables_scope_guard on public.payables;
create trigger trg_payables_scope_guard
before insert or update on public.payables
for each row execute function public.ff_payables_scope_guard();

-- =====================================================
-- 3) MARCAR COMO PAGO/RECEBIDO (atômico)
-- Cria a transação pela MESMA regra do app (ff_create_transaction), marca a
-- conta como paga e, se for mensal, gera a próxima. Tudo ou nada.
-- =====================================================

create or replace function public.ff_settle_payable(
  p_id uuid,
  p_account_id uuid,
  p_date date
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_p public.payables%rowtype;
  v_account uuid;
  v_tx uuid;
  v_month date;
  v_day int;
  v_last int;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_date is null then
    raise exception 'Informe a data do pagamento.' using errcode = '22023';
  end if;

  select * into v_p
    from public.payables
   where id = p_id and user_id = v_user
   for update;

  if not found then
    raise exception 'Conta a pagar/receber não encontrada.' using errcode = '23514';
  end if;

  if v_p.status <> 'pending' then
    raise exception 'Esta conta já foi paga ou cancelada.' using errcode = '23514';
  end if;

  v_account := coalesce(p_account_id, v_p.account_id);

  if v_account is null then
    raise exception 'Escolha a conta do pagamento.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.accounts a
     where a.id = v_account and a.user_id = v_user and a.scope = v_p.scope
  ) then
    raise exception 'A conta escolhida é de outro escopo (Pessoal/Empresa).' using errcode = '23514';
  end if;

  v_tx := public.ff_create_transaction(
    v_account,
    v_p.category_id,
    case when v_p.kind = 'payable' then 'expense' else 'income' end,
    v_p.description,
    v_p.notes,
    v_p.amount,
    p_date
  );

  update public.payables
     set status = 'paid',
         paid_at = p_date,
         account_id = v_account,
         transaction_id = v_tx
   where id = v_p.id;

  if v_p.recurrence = 'monthly' then
    v_month := (date_trunc('month', v_p.due_date) + interval '1 month')::date;
    v_last := extract(day from (v_month + interval '1 month - 1 day'))::int;
    v_day := least(coalesce(v_p.recurrence_day, extract(day from v_p.due_date)::int), v_last);

    insert into public.payables (
      user_id, scope, kind, description, amount, due_date, status,
      account_id, category_id, customer_id, recurrence, recurrence_day, parent_id, notes
    )
    values (
      v_user, v_p.scope, v_p.kind, v_p.description, v_p.amount,
      make_date(extract(year from v_month)::int, extract(month from v_month)::int, v_day),
      'pending', v_account, v_p.category_id, v_p.customer_id,
      'monthly', v_p.recurrence_day, v_p.id, v_p.notes
    )
    on conflict (parent_id) where parent_id is not null do nothing;
  end if;

  return v_tx;
end;
$$;

revoke all on function public.ff_settle_payable(uuid, uuid, date) from public, anon;
grant execute on function public.ff_settle_payable(uuid, uuid, date) to authenticated;
