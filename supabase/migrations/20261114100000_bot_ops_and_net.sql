-- =====================================================
-- Complemento da rodada de qualidade (14/11/2026)
--  - ff_account_daily_net: quanto as contas mudaram em cada dia
--    (para a evolução do patrimônio, sem o limite de 1.000 linhas)
--  - ff_bot_rpc: o bot do WhatsApp também pode editar, transferir
--    entre contas próprias e apagar transferências de forma atômica
-- Idempotente.
-- =====================================================

create or replace function public.ff_account_daily_net(p_scope text, p_after date)
returns table (day date, net numeric)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select t.transaction_date,
         sum(case when t.type = 'income' then t.amount else -t.amount end)::numeric
    from public.transactions t
   where t.user_id = auth.uid()
     and t.scope = p_scope
     and t.account_id is not null
     and t.transaction_date > p_after
   group by t.transaction_date
   order by 1
$$;

revoke all on function public.ff_account_daily_net(text, date) from public, anon;
grant execute on function public.ff_account_daily_net(text, date) to authenticated;

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
    when 'update_transaction' then
      perform public.ff_update_transaction(
        (p_args ->> 'id')::uuid,
        nullif(p_args ->> 'account_id', '')::uuid,
        nullif(p_args ->> 'card_id', '')::uuid,
        nullif(p_args ->> 'category_id', '')::uuid,
        p_args ->> 'type',
        p_args ->> 'title',
        (p_args ->> 'amount')::numeric,
        (p_args ->> 'date')::date
      );
    when 'account_transfer' then
      v_result := to_jsonb(public.ff_account_transfer(
        (p_args ->> 'from_account_id')::uuid,
        (p_args ->> 'to_account_id')::uuid,
        (p_args ->> 'amount')::numeric,
        (p_args ->> 'date')::date,
        p_args ->> 'description'
      ));
    when 'delete_transfer_group' then
      v_result := to_jsonb(public.ff_delete_transfer_group((p_args ->> 'group')::uuid));
    else
      raise exception 'Operação não permitida: %', p_fn using errcode = '42501';
  end case;

  return v_result;
end;
$$;

revoke all on function public.ff_bot_rpc(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.ff_bot_rpc(uuid, text, jsonb) to service_role;
