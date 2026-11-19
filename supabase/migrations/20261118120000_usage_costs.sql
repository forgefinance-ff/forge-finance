-- Forge Finance: tokens de IA e mensagens do WhatsApp por usuário e por dia,
-- para o /admin mostrar o custo real. Guarda só contagens, nunca o conteúdo.
-- Só a service role lê e escreve. Idempotente: pode rodar mais de uma vez.

-- 1) Tokens de IA
create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  source text not null check (source in ('whatsapp', 'assistant')),
  model text not null,
  requests integer not null default 0,
  unpriced_requests integer not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cache_read_tokens bigint not null default 0,
  cache_write_tokens bigint not null default 0,
  -- Custo em milionésimos de dólar, calculado com o preço do dia da chamada.
  cost_usd_micros bigint not null default 0,
  primary key (user_id, day, source, model)
);
create index if not exists ai_usage_daily_day_idx on public.ai_usage_daily (day);
alter table public.ai_usage_daily enable row level security;
revoke all on public.ai_usage_daily from public, anon, authenticated;

-- 2) Mensagens do WhatsApp
create table if not exists public.whatsapp_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  inbound integer not null default 0,
  inbound_audio integer not null default 0,
  outbound_service integer not null default 0,
  outbound_template integer not null default 0,
  outbound_failed integer not null default 0,
  delivery_failed integer not null default 0,
  primary key (user_id, day)
);
create index if not exists whatsapp_usage_daily_day_idx on public.whatsapp_usage_daily (day);
alter table public.whatsapp_usage_daily enable row level security;
revoke all on public.whatsapp_usage_daily from public, anon, authenticated;

-- 3) Registro de uma chamada à IA
create or replace function public.ff_usage_ai_add(
  p_user_id uuid,
  p_source text,
  p_model text,
  p_input bigint,
  p_output bigint,
  p_cache_read bigint,
  p_cache_write bigint,
  p_cost_usd_micros bigint,
  p_priced boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage_daily as u (
    user_id, day, source, model, requests, unpriced_requests,
    input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd_micros
  )
  values (
    p_user_id, (now() at time zone 'America/Sao_Paulo')::date, p_source, p_model, 1,
    case when p_priced then 0 else 1 end,
    p_input, p_output, p_cache_read, p_cache_write, p_cost_usd_micros
  )
  on conflict (user_id, day, source, model) do update
    set requests = u.requests + 1,
        unpriced_requests = u.unpriced_requests + excluded.unpriced_requests,
        input_tokens = u.input_tokens + excluded.input_tokens,
        output_tokens = u.output_tokens + excluded.output_tokens,
        cache_read_tokens = u.cache_read_tokens + excluded.cache_read_tokens,
        cache_write_tokens = u.cache_write_tokens + excluded.cache_write_tokens,
        cost_usd_micros = u.cost_usd_micros + excluded.cost_usd_micros;
$$;

-- 4) Mensagem recebida de um usuário
create or replace function public.ff_usage_wa_inbound(p_user_id uuid, p_audio boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.whatsapp_usage_daily as u (user_id, day, inbound, inbound_audio)
  values (p_user_id, (now() at time zone 'America/Sao_Paulo')::date, 1, case when p_audio then 1 else 0 end)
  on conflict (user_id, day) do update
    set inbound = u.inbound + 1,
        inbound_audio = u.inbound_audio + excluded.inbound_audio;
$$;

-- 5) Mensagem enviada pelo bot (número sem conta não entra na conta por usuário)
create or replace function public.ff_usage_wa_outbound(p_phone text, p_kind text, p_ok boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.whatsapp_usage_daily as u (user_id, day, outbound_service, outbound_template, outbound_failed)
  select l.user_id,
         (now() at time zone 'America/Sao_Paulo')::date,
         case when p_ok and p_kind = 'service' then 1 else 0 end,
         case when p_ok and p_kind = 'template' then 1 else 0 end,
         case when p_ok then 0 else 1 end
    from public.whatsapp_links l
   where l.phone = p_phone
  on conflict (user_id, day) do update
    set outbound_service = u.outbound_service + excluded.outbound_service,
        outbound_template = u.outbound_template + excluded.outbound_template,
        outbound_failed = u.outbound_failed + excluded.outbound_failed;
$$;

-- 6) A Meta aceitou a mensagem, mas avisou depois que a entrega falhou
create or replace function public.ff_usage_wa_delivery_failed(p_phone text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  insert into public.whatsapp_outbound_daily as o (day, kind, sent, failed)
  values (v_day, 'service', 0, 1)
  on conflict (day, kind) do update set failed = o.failed + 1;

  insert into public.whatsapp_usage_daily as u (user_id, day, delivery_failed)
  select l.user_id, v_day, 1
    from public.whatsapp_links l
   where l.phone = p_phone
  on conflict (user_id, day) do update
    set delivery_failed = u.delivery_failed + 1;
end;
$$;

-- 7) Painel admin: uso do mês por usuário, com os totais de todos
create or replace function public.ff_admin_usage(
  p_month date,
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  plan_id text,
  access_source text,
  status text,
  ai_requests bigint,
  unpriced_requests bigint,
  input_tokens bigint,
  output_tokens bigint,
  cache_read_tokens bigint,
  cache_write_tokens bigint,
  ai_cost_usd_micros bigint,
  inbound bigint,
  inbound_audio bigint,
  outbound_service bigint,
  outbound_template bigint,
  outbound_failed bigint,
  delivery_failed bigint,
  total_users bigint,
  total_ai_requests bigint,
  total_unpriced_requests bigint,
  total_tokens bigint,
  total_ai_cost_usd_micros bigint,
  total_inbound bigint,
  total_outbound_service bigint,
  total_outbound_template bigint,
  total_delivery_failed bigint
)
language sql
security definer
set search_path = public
as $$
  with ai as (
    select a.user_id,
           sum(a.requests)::bigint as ai_requests,
           sum(a.unpriced_requests)::bigint as unpriced_requests,
           sum(a.input_tokens)::bigint as input_tokens,
           sum(a.output_tokens)::bigint as output_tokens,
           sum(a.cache_read_tokens)::bigint as cache_read_tokens,
           sum(a.cache_write_tokens)::bigint as cache_write_tokens,
           sum(a.cost_usd_micros)::bigint as ai_cost_usd_micros
      from public.ai_usage_daily a
     where a.day >= p_month and a.day < (p_month + interval '1 month')::date
     group by a.user_id
  ),
  wa as (
    select w.user_id,
           sum(w.inbound)::bigint as inbound,
           sum(w.inbound_audio)::bigint as inbound_audio,
           sum(w.outbound_service)::bigint as outbound_service,
           sum(w.outbound_template)::bigint as outbound_template,
           sum(w.outbound_failed)::bigint as outbound_failed,
           sum(w.delivery_failed)::bigint as delivery_failed
      from public.whatsapp_usage_daily w
     where w.day >= p_month and w.day < (p_month + interval '1 month')::date
     group by w.user_id
  ),
  merged as (
    select coalesce(ai.user_id, wa.user_id) as user_id,
           coalesce(ai.ai_requests, 0) as ai_requests,
           coalesce(ai.unpriced_requests, 0) as unpriced_requests,
           coalesce(ai.input_tokens, 0) as input_tokens,
           coalesce(ai.output_tokens, 0) as output_tokens,
           coalesce(ai.cache_read_tokens, 0) as cache_read_tokens,
           coalesce(ai.cache_write_tokens, 0) as cache_write_tokens,
           coalesce(ai.ai_cost_usd_micros, 0) as ai_cost_usd_micros,
           coalesce(wa.inbound, 0) as inbound,
           coalesce(wa.inbound_audio, 0) as inbound_audio,
           coalesce(wa.outbound_service, 0) as outbound_service,
           coalesce(wa.outbound_template, 0) as outbound_template,
           coalesce(wa.outbound_failed, 0) as outbound_failed,
           coalesce(wa.delivery_failed, 0) as delivery_failed
      from ai
      full join wa on wa.user_id = ai.user_id
  )
  select m.user_id,
         u.email::text,
         p.full_name,
         coalesce(e.plan_id, 'free'),
         coalesce(e.access_source, 'beta'),
         coalesce(e.status, 'beta'),
         m.ai_requests,
         m.unpriced_requests,
         m.input_tokens,
         m.output_tokens,
         m.cache_read_tokens,
         m.cache_write_tokens,
         m.ai_cost_usd_micros,
         m.inbound,
         m.inbound_audio,
         m.outbound_service,
         m.outbound_template,
         m.outbound_failed,
         m.delivery_failed,
         count(*) over (),
         (sum(m.ai_requests) over ())::bigint,
         (sum(m.unpriced_requests) over ())::bigint,
         (sum(m.input_tokens + m.output_tokens + m.cache_read_tokens + m.cache_write_tokens) over ())::bigint,
         (sum(m.ai_cost_usd_micros) over ())::bigint,
         (sum(m.inbound) over ())::bigint,
         (sum(m.outbound_service) over ())::bigint,
         (sum(m.outbound_template) over ())::bigint,
         (sum(m.delivery_failed) over ())::bigint
    from merged m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
    left join public.user_entitlements e on e.user_id = m.user_id
   order by m.ai_cost_usd_micros desc, m.outbound_service + m.outbound_template desc, m.user_id
   limit greatest(1, least(coalesce(p_limit, 200), 500))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- 8) Nenhuma destas funções é acessível pelo navegador
revoke all on function public.ff_usage_ai_add(uuid, text, text, bigint, bigint, bigint, bigint, bigint, boolean) from public, anon, authenticated;
revoke all on function public.ff_usage_wa_inbound(uuid, boolean) from public, anon, authenticated;
revoke all on function public.ff_usage_wa_outbound(text, text, boolean) from public, anon, authenticated;
revoke all on function public.ff_usage_wa_delivery_failed(text) from public, anon, authenticated;
revoke all on function public.ff_admin_usage(date, integer, integer) from public, anon, authenticated;

grant execute on function public.ff_usage_ai_add(uuid, text, text, bigint, bigint, bigint, bigint, bigint, boolean) to service_role;
grant execute on function public.ff_usage_wa_inbound(uuid, boolean) to service_role;
grant execute on function public.ff_usage_wa_outbound(text, text, boolean) to service_role;
grant execute on function public.ff_usage_wa_delivery_failed(text) to service_role;
grant execute on function public.ff_admin_usage(date, integer, integer) to service_role;
