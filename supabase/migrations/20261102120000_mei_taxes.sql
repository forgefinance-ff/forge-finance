-- Forge Finance: Fase 4 do MEI — impostos (limite de faturamento, DAS e DASN-SIMEI).
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Nenhum valor de imposto ou limite é definido aqui: o usuário preenche no app.

-- =====================================================
-- 1) CONFIGURAÇÕES DO MEI (uma linha por usuário)
-- =====================================================

create table if not exists public.mei_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  activity text not null default 'servicos' check (activity in ('servicos', 'comercio', 'ambos')),
  -- Dia de vencimento do DAS (padrão 20, editável).
  das_due_day smallint not null default 20 check (das_due_day between 1 and 31),
  -- Ficam vazios até o usuário preencher (conferir no Portal do Empreendedor).
  annual_limit numeric(14,2) check (annual_limit is null or annual_limit > 0),
  das_amount numeric(14,2) check (das_amount is null or das_amount > 0),
  opening_date date,
  -- Prazo da Declaração Anual (DASN-SIMEI), informado pelo usuário.
  dasn_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mei_settings enable row level security;

drop policy if exists "mei_settings_own" on public.mei_settings;
create policy "mei_settings_own"
  on public.mei_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_mei_settings_updated on public.mei_settings;
create trigger trg_mei_settings_updated
before update on public.mei_settings
for each row execute function public.handle_updated_at();

-- =====================================================
-- 2) GUIAS DO DAS (uma por competência)
-- =====================================================

create table if not exists public.mei_das_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Primeiro dia do mês de competência.
  competence date not null check (extract(day from competence) = 1),
  amount numeric(14,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at date,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint mei_das_unique_competence unique (user_id, competence),
  constraint mei_das_paid_has_date check (status <> 'paid' or paid_at is not null)
);

create index if not exists mei_das_user_due_idx
  on public.mei_das_payments (user_id, status, due_date);

alter table public.mei_das_payments enable row level security;

drop policy if exists "mei_das_payments_own" on public.mei_das_payments;
create policy "mei_das_payments_own"
  on public.mei_das_payments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================
-- 3) PAGAR O DAS (atômico)
-- Cria a despesa na categoria "Impostos" da empresa (cria a categoria se não
-- existir) pela mesma regra do app (ff_create_transaction) e marca como pago.
-- =====================================================

create or replace function public.ff_pay_das(
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
  v_das public.mei_das_payments%rowtype;
  v_category uuid;
  v_title text;
  v_tx uuid;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_date is null then
    raise exception 'Informe a data do pagamento.' using errcode = '22023';
  end if;

  select * into v_das
    from public.mei_das_payments
   where id = p_id and user_id = v_user
   for update;

  if not found then
    raise exception 'Guia do DAS não encontrada.' using errcode = '23514';
  end if;

  if v_das.status <> 'pending' then
    raise exception 'Este DAS já foi pago.' using errcode = '23514';
  end if;

  if p_account_id is null or not exists (
    select 1 from public.accounts a
     where a.id = p_account_id and a.user_id = v_user and a.scope = 'business'
  ) then
    raise exception 'Escolha uma conta da empresa para pagar o DAS.' using errcode = '23514';
  end if;

  select c.id into v_category
    from public.categories c
   where c.user_id = v_user
     and c.scope = 'business'
     and c.type = 'expense'
     and lower(c.name) = 'impostos'
   order by c.created_at
   limit 1;

  if v_category is null then
    insert into public.categories (user_id, name, type, color, icon, scope)
    values (v_user, 'Impostos', 'expense', '#EF4444', '🧾', 'business')
    returning id into v_category;
  end if;

  v_title := 'DAS MEI ' || to_char(v_das.competence, 'MM/YYYY');

  v_tx := public.ff_create_transaction(
    p_account_id, v_category, 'expense', v_title, v_title, v_das.amount, p_date
  );

  update public.mei_das_payments
     set status = 'paid',
         paid_at = p_date,
         transaction_id = v_tx
   where id = v_das.id;

  return v_tx;
end;
$$;

revoke all on function public.ff_pay_das(uuid, uuid, date) from public, anon;
grant execute on function public.ff_pay_das(uuid, uuid, date) to authenticated;

-- =====================================================
-- 4) CORREÇÃO DA FASE 3: a transação criada ao pagar/receber uma conta
-- passava as observações no campo "description" (que é o que a lista de
-- transações mostra). Agora usa a descrição da conta, como o app faz.
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
    v_p.description,
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

-- Ajusta as transações já criadas por contas pagas/recebidas.
update public.transactions t
   set description = p.description
  from public.payables p
 where p.transaction_id = t.id
   and (t.description is null or t.description = coalesce(p.notes, ''));
