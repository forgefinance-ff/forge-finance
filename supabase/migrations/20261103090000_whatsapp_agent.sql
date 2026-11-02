-- Forge Finance: bot do WhatsApp como automatizador do app.
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Depende das migrations do MEI (ff_create_transaction, ff_delete_transaction,
-- ff_settle_payable e ff_pay_das).

-- =====================================================
-- 1) OPERAÇÕES ATÔMICAS EM NOME DO USUÁRIO VINCULADO
-- O bot roda com a chave de serviço (sem usuário logado). Esta função, que só
-- a chave de serviço pode chamar, executa as MESMAS funções do app como se o
-- usuário vinculado ao WhatsApp estivesse logado. Nenhuma regra nova de saldo.
-- =====================================================

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

  -- Só usuários com WhatsApp vinculado.
  if not exists (select 1 from public.whatsapp_links l where l.user_id = p_user_id) then
    raise exception 'Usuário sem WhatsApp vinculado.' using errcode = '42501';
  end if;

  -- Vale só dentro desta transação: auth.uid() passa a ser o usuário vinculado.
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

-- =====================================================
-- 2) MEMÓRIA DA CONVERSA (últimos 15 minutos; o servidor apaga o resto)
-- =====================================================

create table if not exists public.whatsapp_conversation (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_conversation_phone_idx
  on public.whatsapp_conversation (phone, created_at desc);

alter table public.whatsapp_conversation enable row level security;

-- O usuário só enxerga a própria conversa; escrita é feita pelo servidor.
drop policy if exists "whatsapp_conversation_select_own" on public.whatsapp_conversation;
create policy "whatsapp_conversation_select_own"
  on public.whatsapp_conversation
  for select
  using (auth.uid() = user_id);

-- =====================================================
-- 3) HISTÓRICO DO QUE O BOT EXECUTOU
-- =====================================================

create table if not exists public.whatsapp_action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  action text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('executed', 'failed')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_action_log_user_idx
  on public.whatsapp_action_log (user_id, created_at desc);

alter table public.whatsapp_action_log enable row level security;

drop policy if exists "whatsapp_action_log_select_own" on public.whatsapp_action_log;
create policy "whatsapp_action_log_select_own"
  on public.whatsapp_action_log
  for select
  using (auth.uid() = user_id);
