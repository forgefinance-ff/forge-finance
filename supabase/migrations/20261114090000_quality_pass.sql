-- =====================================================
-- Rodada de qualidade (auditoria 14/11/2026)
--
--  1. Totais calculados no banco (sem o limite de 1.000 linhas da API)
--  2. Saldo "até hoje": lançamentos com data futura ficam "a vencer"
--  3. Transferência entre contas próprias (não é receita nem despesa)
--  4. Editar transação, mantendo o saldo certo
--  5. Exclusão atômica de transferências
--  6. Devolução da cota da IA quando o provedor falha
--  7. Limite de requisições compartilhado entre servidores
--  8. Orçamentos por categoria
--  9. Preferências de avisos (resumo semanal, alertas de orçamento)
-- 10. WhatsApp: estado da mensagem (não perde mensagem se o servidor cair)
--
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================

-- Data de hoje no fuso de Brasília (o banco roda em UTC).
create or replace function public.ff_today()
returns date
language sql
stable
set search_path = pg_catalog
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create index if not exists transactions_user_scope_date_idx
  on public.transactions (user_id, scope, transaction_date);

create index if not exists transactions_account_date_idx
  on public.transactions (account_id, transaction_date)
  where account_id is not null;

-- =====================================================
-- 1) TOTAIS NO BANCO
-- =====================================================

-- Soma por tipo e natureza num intervalo (datas inclusivas; null = sem limite).
create or replace function public.ff_totals(p_scope text, p_from date default null, p_to date default null)
returns table (type text, kind text, total numeric, n bigint)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select t.type, t.kind, coalesce(sum(t.amount), 0)::numeric, count(*)
    from public.transactions t
   where t.user_id = auth.uid()
     and t.scope = p_scope
     and (p_from is null or t.transaction_date >= p_from)
     and (p_to is null or t.transaction_date <= p_to)
   group by t.type, t.kind
$$;

-- Soma por categoria (só receitas/despesas de verdade).
create or replace function public.ff_category_totals(
  p_scope text,
  p_type text default 'expense',
  p_from date default null,
  p_to date default null
)
returns table (category_id uuid, name text, icon text, color text, total numeric, n bigint)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select c.id, coalesce(c.name, 'Sem categoria'), c.icon, c.color,
         coalesce(sum(t.amount), 0)::numeric, count(*)
    from public.transactions t
    left join public.categories c on c.id = t.category_id
   where t.user_id = auth.uid()
     and t.scope = p_scope
     and t.type = p_type
     and t.kind = 'regular'
     and (p_from is null or t.transaction_date >= p_from)
     and (p_to is null or t.transaction_date <= p_to)
   group by c.id, c.name, c.icon, c.color
   order by 5 desc
$$;

-- Receitas e despesas por dia (para gráficos).
create or replace function public.ff_daily_totals(p_scope text, p_from date, p_to date)
returns table (day date, income numeric, expense numeric)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select t.transaction_date,
         coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric,
         coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric
    from public.transactions t
   where t.user_id = auth.uid()
     and t.scope = p_scope
     and t.kind = 'regular'
     and t.transaction_date between p_from and p_to
   group by t.transaction_date
   order by 1
$$;

-- Receitas e despesas por mês (para gráficos longos).
create or replace function public.ff_monthly_totals(p_scope text, p_from date default null, p_to date default null)
returns table (month date, income numeric, expense numeric)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select date_trunc('month', t.transaction_date)::date,
         coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric,
         coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric
    from public.transactions t
   where t.user_id = auth.uid()
     and t.scope = p_scope
     and t.kind = 'regular'
     and (p_from is null or t.transaction_date >= p_from)
     and (p_to is null or t.transaction_date <= p_to)
   group by 1
   order by 1
$$;

revoke all on function public.ff_totals(text, date, date) from public, anon;
revoke all on function public.ff_category_totals(text, text, date, date) from public, anon;
revoke all on function public.ff_daily_totals(text, date, date) from public, anon;
revoke all on function public.ff_monthly_totals(text, date, date) from public, anon;
grant execute on function public.ff_totals(text, date, date) to authenticated;
grant execute on function public.ff_category_totals(text, text, date, date) to authenticated;
grant execute on function public.ff_daily_totals(text, date, date) to authenticated;
grant execute on function public.ff_monthly_totals(text, date, date) to authenticated;
grant execute on function public.ff_today() to authenticated;

-- =====================================================
-- 2) SALDO ATÉ HOJE
--    current_balance continua somando tudo (inclusive datas futuras).
--    A view separa o que já aconteceu (balance_today) do que está
--    agendado (balance_future). O app lê a view.
-- =====================================================

create or replace view public.accounts_today
with (security_invoker = true)
as
select a.*,
       (coalesce(a.current_balance, 0) - coalesce(f.future, 0))::numeric(14,2) as balance_today,
       coalesce(f.future, 0)::numeric(14,2) as balance_future
  from public.accounts a
  left join lateral (
    select sum(case when t.type = 'income' then t.amount else -t.amount end) as future
      from public.transactions t
     where t.account_id = a.id
       and t.transaction_date > public.ff_today()
  ) f on true;

grant select on public.accounts_today to authenticated;

-- =====================================================
-- 3) TRANSFERÊNCIA ENTRE CONTAS PRÓPRIAS
-- =====================================================

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.transactions'::regclass
       and conname = 'transactions_kind_check'
       and pg_get_constraintdef(oid) like '%''transfer''%'
  ) then
    alter table public.transactions drop constraint if exists transactions_kind_check;
    alter table public.transactions
      add constraint transactions_kind_check
      check (kind in ('regular', 'contribution', 'loan', 'refund', 'card_payment', 'transfer'));
  end if;
end $$;

-- A natureza vem da categoria; pagamento de fatura e transferência são fixos.
create or replace function public.ff_transaction_kind_from_category()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.kind = 'transfer' and new.transfer_group is not null then
    return new;
  end if;

  if new.card_id is not null and new.account_id is not null then
    new.kind := 'card_payment';
    return new;
  end if;

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

create or replace function public.ff_account_transfer(
  p_from_account uuid,
  p_to_account uuid,
  p_amount numeric,
  p_date date,
  p_description text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_amount numeric(14,2) := round(p_amount, 2);
  v_group uuid := gen_random_uuid();
  v_from public.accounts%rowtype;
  v_to public.accounts%rowtype;
  v_note text := nullif(trim(coalesce(p_description, '')), '');
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'O valor deve ser maior que zero.' using errcode = '22023';
  end if;
  if p_date is null then
    raise exception 'Informe uma data válida.' using errcode = '22023';
  end if;
  if p_from_account = p_to_account then
    raise exception 'Escolha duas contas diferentes.' using errcode = '22023';
  end if;

  select * into v_from from public.accounts where id = p_from_account and user_id = v_user for update;
  if not found then
    raise exception 'Conta de origem não encontrada.' using errcode = '23514';
  end if;
  select * into v_to from public.accounts where id = p_to_account and user_id = v_user for update;
  if not found then
    raise exception 'Conta de destino não encontrada.' using errcode = '23514';
  end if;
  if v_from.scope <> v_to.scope then
    raise exception 'Entre Pessoal e Empresa use pró-labore, retirada ou aporte.' using errcode = '22023';
  end if;

  insert into public.transactions (
    user_id, account_id, category_id, type, kind, title, description, amount, transaction_date, transfer_group
  ) values
    (v_user, v_from.id, null, 'expense', 'transfer',
     'Transferência para ' || v_to.name, coalesce(v_note, 'Transferência para ' || v_to.name),
     v_amount, p_date, v_group),
    (v_user, v_to.id, null, 'income', 'transfer',
     'Transferência de ' || v_from.name, coalesce(v_note, 'Transferência de ' || v_from.name),
     v_amount, p_date, v_group);

  update public.accounts set current_balance = coalesce(current_balance, 0) - v_amount where id = v_from.id;
  update public.accounts set current_balance = coalesce(current_balance, 0) + v_amount where id = v_to.id;

  return v_group;
end;
$$;

revoke all on function public.ff_account_transfer(uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.ff_account_transfer(uuid, uuid, numeric, date, text) to authenticated;

-- =====================================================
-- 4) EDITAR TRANSAÇÃO
--    Desfaz o efeito antigo no saldo e aplica o novo, numa só transação.
--    Pode trocar entre conta e cartão.
-- =====================================================

create or replace function public.ff_update_transaction(
  p_id uuid,
  p_account_id uuid,
  p_card_id uuid,
  p_category_id uuid,
  p_type text,
  p_title text,
  p_amount numeric,
  p_date date
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions%rowtype;
  v_amount numeric(14,2) := round(p_amount, 2);
  v_title text := coalesce(nullif(trim(p_title), ''), 'Sem descrição');
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  select * into v_tx from public.transactions where id = p_id and user_id = v_user for update;
  if not found then
    raise exception 'Transação não encontrada.' using errcode = '23514';
  end if;

  if v_tx.transfer_group is not null or v_tx.kind = 'card_payment' then
    raise exception 'Transferências e pagamentos de fatura não podem ser editados. Exclua e registre de novo.'
      using errcode = '22023';
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
  if (p_account_id is null) = (p_card_id is null) then
    raise exception 'Escolha uma conta ou um cartão.' using errcode = '22023';
  end if;
  if p_card_id is not null and not exists (select 1 from public.cards where id = p_card_id and user_id = v_user) then
    raise exception 'Cartão não encontrado.' using errcode = '23514';
  end if;

  -- Desfaz o efeito antigo.
  if v_tx.account_id is not null then
    update public.accounts
       set current_balance = coalesce(current_balance, 0)
         - case when v_tx.type = 'income' then v_tx.amount else -v_tx.amount end
     where id = v_tx.account_id and user_id = v_user;
  end if;

  update public.transactions
     set account_id = p_account_id,
         card_id = p_card_id,
         category_id = p_category_id,
         type = p_type,
         title = v_title,
         description = v_title,
         amount = v_amount,
         transaction_date = p_date,
         updated_at = now()
   where id = v_tx.id;

  -- Aplica o novo.
  if p_account_id is not null then
    update public.accounts
       set current_balance = coalesce(current_balance, 0)
         + case when p_type = 'income' then v_amount else -v_amount end
     where id = p_account_id and user_id = v_user;
    if not found then
      raise exception 'Conta não encontrada.' using errcode = '23514';
    end if;
  end if;
end;
$$;

revoke all on function public.ff_update_transaction(uuid, uuid, uuid, uuid, text, text, numeric, date) from public, anon;
grant execute on function public.ff_update_transaction(uuid, uuid, uuid, uuid, text, text, numeric, date) to authenticated;

-- =====================================================
-- 5) EXCLUSÃO ATÔMICA DE TRANSFERÊNCIAS (contas próprias e Pessoal/Empresa)
-- =====================================================

create or replace function public.ff_delete_transfer_group(p_group uuid)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_tx public.transactions%rowtype;
  v_n integer := 0;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  for v_tx in
    select * from public.transactions
     where transfer_group = p_group and user_id = v_user
     for update
  loop
    if v_tx.account_id is not null then
      update public.accounts
         set current_balance = coalesce(current_balance, 0)
           - case when v_tx.type = 'income' then v_tx.amount else -v_tx.amount end
       where id = v_tx.account_id and user_id = v_user;
    end if;
    delete from public.transactions where id = v_tx.id;
    v_n := v_n + 1;
  end loop;

  if v_n = 0 then
    raise exception 'Transferência não encontrada.' using errcode = '23514';
  end if;

  return v_n;
end;
$$;

revoke all on function public.ff_delete_transfer_group(uuid) from public, anon;
grant execute on function public.ff_delete_transfer_group(uuid) to authenticated;

-- =====================================================
-- 6) DEVOLVE A COTA DA IA QUANDO O PROVEDOR FALHA
-- =====================================================

create or replace function public.refund_my_ai_quota()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  update public.usage_records
     set usage_count = greatest(usage_count - 1, 0), updated_at = now()
   where user_id = auth.uid()
     and resource = 'ai_assistant'
     and period_start = date_trunc('month', now() at time zone 'UTC')::date;
end;
$$;

revoke all on function public.refund_my_ai_quota() from public, anon;
grant execute on function public.refund_my_ai_quota() to authenticated;

-- =====================================================
-- 7) LIMITE DE REQUISIÇÕES COMPARTILHADO
-- =====================================================

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits integer not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;
comment on table public.rate_limits is 'Contadores de limite de requisições. Só funções do banco acessam.';

-- true = pode seguir; false = passou do limite na janela.
create or replace function public.ff_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := left(p_bucket, 60) || ':' || coalesce(auth.uid()::text, 'anon');
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (v_key, now(), 1)
  on conflict (key) do update
     set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
         window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.ff_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.ff_rate_limit(text, integer, integer) to authenticated;

-- =====================================================
-- 8) ORÇAMENTOS POR CATEGORIA
-- =====================================================

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  monthly_limit numeric(14,2) not null check (monthly_limit > 0 and monthly_limit <= 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table public.budgets enable row level security;

drop policy if exists budgets_select on public.budgets;
drop policy if exists budgets_insert on public.budgets;
drop policy if exists budgets_update on public.budgets;
drop policy if exists budgets_delete on public.budgets;

create policy budgets_select on public.budgets
  for select to authenticated using (user_id = auth.uid());
create policy budgets_insert on public.budgets
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid() and c.type = 'expense')
  );
create policy budgets_update on public.budgets
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.categories c where c.id = category_id and c.user_id = auth.uid() and c.type = 'expense')
  );
create policy budgets_delete on public.budgets
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.budgets to authenticated;

-- =====================================================
-- 9) PREFERÊNCIAS DE AVISOS
-- =====================================================

create table if not exists public.notification_prefs (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  weekly_summary boolean not null default false,
  budget_alerts boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_select on public.notification_prefs;
drop policy if exists notification_prefs_upsert on public.notification_prefs;
drop policy if exists notification_prefs_update on public.notification_prefs;

create policy notification_prefs_select on public.notification_prefs
  for select to authenticated using (user_id = auth.uid());
create policy notification_prefs_upsert on public.notification_prefs
  for insert to authenticated with check (user_id = auth.uid());
create policy notification_prefs_update on public.notification_prefs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.notification_prefs to authenticated;

-- =====================================================
-- 10) WHATSAPP: estado de cada mensagem
--     'processing' por mais de 2 minutos = servidor caiu; pode reprocessar.
-- =====================================================

alter table public.whatsapp_processed_messages
  add column if not exists status text not null default 'done';
alter table public.whatsapp_processed_messages
  add column if not exists finished_at timestamptz;
