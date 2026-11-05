-- =====================================================
-- Cartão de crédito de verdade: compras na fatura e pagamento de fatura.
--
--   Compra no cartão:      card_id preenchido, account_id vazio.
--                          É despesa na data da compra; NÃO mexe em saldo.
--   Pagamento de fatura:   card_id E account_id preenchidos.
--                          Tira o dinheiro da conta; NÃO é despesa
--                          (natureza 'card_payment').
--   Lançamento comum:      só account_id (como antes).
--
-- Idempotente. Depende de 20261104090000_movement_kinds.sql.
-- =====================================================

alter table public.transactions
  add column if not exists card_id uuid references public.cards(id) on delete restrict;

create index if not exists transactions_card_idx
  on public.transactions (card_id, transaction_date)
  where card_id is not null;

-- Natureza nova, só para transações (categorias continuam com as 4 de antes).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.transactions'::regclass
       and conname = 'transactions_kind_check'
       and pg_get_constraintdef(oid) like '%card_payment%'
  ) then
    alter table public.transactions drop constraint if exists transactions_kind_check;
    alter table public.transactions
      add constraint transactions_kind_check
      check (kind in ('regular', 'contribution', 'loan', 'refund', 'card_payment'));
  end if;
end $$;

-- A natureza vem da categoria; pagamento de fatura é sempre 'card_payment'.
create or replace function public.ff_transaction_kind_from_category()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
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

create or replace trigger trg_transactions_kind
before insert or update of category_id, card_id, account_id on public.transactions
for each row execute function public.ff_transaction_kind_from_category();

-- Escopo: vem da conta; compra no cartão (sem conta) pega o escopo do cartão.
create or replace function public.ff_transactions_scope_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_account_scope text;
  v_card_scope text;
  v_category_scope text;
begin
  if new.card_id is not null then
    select c.scope into v_card_scope
      from public.cards c
     where c.id = new.card_id
       and c.user_id = new.user_id;

    if not found then
      raise exception 'Cartão inválido para esta transação.' using errcode = '23514';
    end if;
  end if;

  if new.account_id is not null then
    select a.scope into v_account_scope
      from public.accounts a
     where a.id = new.account_id
       and a.user_id = new.user_id;

    if not found then
      raise exception 'Conta inválida para esta transação.' using errcode = '23514';
    end if;

    new.scope := v_account_scope;
  elsif v_card_scope is not null then
    new.scope := v_card_scope;
  end if;

  if v_card_scope is not null and v_card_scope <> new.scope then
    raise exception 'O cartão e a conta pertencem a escopos diferentes (Pessoal/Empresa).'
      using errcode = '23514';
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

create or replace trigger trg_transactions_scope_guard
before insert or update of account_id, card_id, category_id, scope, user_id on public.transactions
for each row execute function public.ff_transactions_scope_guard();

-- -----------------------------------------------------
-- Compra no cartão (com parcelas). Cada parcela é uma despesa no mês dela.
-- Estorno no cartão: p_type = 'income' (abate a fatura).
-- Retorna o id da primeira parcela.
-- -----------------------------------------------------
create or replace function public.ff_create_card_purchase(
  p_card_id uuid,
  p_category_id uuid,
  p_type text,
  p_title text,
  p_amount numeric,
  p_date date,
  p_installments integer default 1
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_total numeric(14,2) := round(p_amount, 2);
  v_n integer := greatest(1, least(coalesce(p_installments, 1), 48));
  v_part numeric(14,2);
  v_amount numeric(14,2);
  v_title text := coalesce(nullif(trim(p_title), ''), 'Compra no cartão');
  v_first uuid;
  v_id uuid;
  i integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '28000';
  end if;

  if p_type is null or p_type not in ('income', 'expense') then
    raise exception 'Tipo de transação inválido.' using errcode = '22023';
  end if;

  if v_total is null or v_total <= 0 then
    raise exception 'O valor deve ser maior que zero.' using errcode = '22023';
  end if;

  if p_date is null then
    raise exception 'Informe uma data válida.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.cards where id = p_card_id and user_id = v_user) then
    raise exception 'Cartão não encontrado.' using errcode = '23514';
  end if;

  if p_type = 'income' then
    v_n := 1;
  end if;

  v_part := trunc(v_total / v_n, 2);

  for i in 1..v_n loop
    -- A última parcela leva os centavos que sobraram da divisão.
    v_amount := case when i = v_n then v_total - v_part * (v_n - 1) else v_part end;

    insert into public.transactions (
      user_id, card_id, account_id, category_id, type, title, description, amount, transaction_date
    )
    values (
      v_user, p_card_id, null, p_category_id, p_type,
      case when v_n > 1 then v_title || ' (' || i || '/' || v_n || ')' else v_title end,
      case when v_n > 1 then v_title || ' (' || i || '/' || v_n || ')' else v_title end,
      v_amount,
      (p_date + make_interval(months => i - 1))::date
    )
    returning id into v_id;

    if i = 1 then
      v_first := v_id;
    end if;
  end loop;

  return v_first;
end;
$$;

revoke all on function public.ff_create_card_purchase(uuid, uuid, text, text, numeric, date, integer) from public, anon;
grant execute on function public.ff_create_card_purchase(uuid, uuid, text, text, numeric, date, integer) to authenticated;

-- -----------------------------------------------------
-- Pagamento de fatura: sai da conta, não é despesa.
-- -----------------------------------------------------
create or replace function public.ff_pay_card_invoice(
  p_card_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_date date,
  p_title text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
  v_amount numeric(14,2) := round(p_amount, 2);
  v_card_name text;
  v_id uuid;
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

  select name into v_card_name from public.cards where id = p_card_id and user_id = v_user;
  if v_card_name is null then
    raise exception 'Cartão não encontrado.' using errcode = '23514';
  end if;

  insert into public.transactions (
    user_id, card_id, account_id, category_id, type, title, description, amount, transaction_date
  )
  values (
    v_user, p_card_id, p_account_id, null, 'expense',
    coalesce(nullif(trim(p_title), ''), 'Pagamento da fatura ' || v_card_name),
    coalesce(nullif(trim(p_title), ''), 'Pagamento da fatura ' || v_card_name),
    v_amount, p_date
  )
  returning id into v_id;

  update public.accounts
     set current_balance = coalesce(current_balance, 0) - v_amount
   where id = p_account_id
     and user_id = v_user;

  if not found then
    raise exception 'Conta não encontrada.' using errcode = '23514';
  end if;

  return v_id;
end;
$$;

revoke all on function public.ff_pay_card_invoice(uuid, uuid, numeric, date, text) from public, anon;
grant execute on function public.ff_pay_card_invoice(uuid, uuid, numeric, date, text) to authenticated;

-- -----------------------------------------------------
-- Bot do WhatsApp: as mesmas duas operações.
-- -----------------------------------------------------
create or replace function public.ff_bot_rpc(
  p_user_id uuid,
  p_fn text,
  p_args jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb := 'null'::jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Operação não autorizada.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.whatsapp_links l where l.user_id = p_user_id) then
    raise exception 'Usuário sem WhatsApp vinculado.' using errcode = '42501';
  end if;

  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_user_id, 'role', 'authenticated')::text,
    true
  );

  case p_fn
    when 'create_transaction' then
      v_result := to_jsonb(public.ff_create_transaction(
        (p_args ->> 'account_id')::uuid,
        nullif(p_args ->> 'category_id', '')::uuid,
        p_args ->> 'type',
        p_args ->> 'title',
        p_args ->> 'description',
        (p_args ->> 'amount')::numeric,
        (p_args ->> 'date')::date
      ));
    when 'create_card_purchase' then
      v_result := to_jsonb(public.ff_create_card_purchase(
        (p_args ->> 'card_id')::uuid,
        nullif(p_args ->> 'category_id', '')::uuid,
        p_args ->> 'type',
        p_args ->> 'title',
        (p_args ->> 'amount')::numeric,
        (p_args ->> 'date')::date,
        coalesce((p_args ->> 'installments')::integer, 1)
      ));
    when 'pay_card_invoice' then
      v_result := to_jsonb(public.ff_pay_card_invoice(
        (p_args ->> 'card_id')::uuid,
        (p_args ->> 'account_id')::uuid,
        (p_args ->> 'amount')::numeric,
        (p_args ->> 'date')::date,
        p_args ->> 'title'
      ));
    when 'delete_transaction' then
      perform public.ff_delete_transaction((p_args ->> 'id')::uuid);
    when 'settle_payable' then
      v_result := to_jsonb(public.ff_settle_payable(
        (p_args ->> 'id')::uuid,
        nullif(p_args ->> 'account_id', '')::uuid,
        (p_args ->> 'date')::date
      ));
    when 'pay_das' then
      v_result := to_jsonb(public.ff_pay_das(
        (p_args ->> 'id')::uuid,
        (p_args ->> 'account_id')::uuid,
        (p_args ->> 'date')::date
      ));
    else
      raise exception 'Operação não permitida: %', p_fn using errcode = '42501';
  end case;

  return v_result;
end;
$$;

revoke all on function public.ff_bot_rpc(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.ff_bot_rpc(uuid, text, jsonb) to service_role;
