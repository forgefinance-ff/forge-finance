-- Forge Finance: painel de administração (/admin).
-- Tudo aqui roda só com a chave service role (servidor). Nenhuma função é
-- executável por usuários logados ou anônimos.
-- Mostra contagens e dados de conta; NUNCA o conteúdo financeiro dos usuários.
-- Idempotente: pode rodar mais de uma vez.

-- 1) Registro de ações dos admins (quem fez o quê, quando e por quê)
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  reason text not null default '',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from public, anon, authenticated;

-- 2) Visão geral: funil, receita, uso e saúde, num único JSON
create or replace function public.ff_admin_overview(p_month_price_cents integer, p_year_price_cents integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz text := 'America/Sao_Paulo';
  v_month_start date := date_trunc('month', (now() at time zone v_tz))::date;
  v_result jsonb;
begin
  with
  users as (
    select u.id, u.created_at from auth.users u
  ),
  tx as (
    select t.user_id, min(t.created_at) as first_at, max(t.created_at) as last_at,
           count(*) as n,
           bool_or(t.scope = 'business') as has_business
      from public.transactions t
     group by t.user_id
  ),
  ent as (
    select e.* from public.user_entitlements e
  ),
  paying as (
    select * from ent
     where plan_id = 'pro' and access_source = 'subscription' and status in ('active', 'past_due')
  ),
  cohort as (
    select u.id, u.created_at,
           exists (select 1 from public.whatsapp_links w where w.user_id = u.id) as whatsapp,
           tx.first_at, tx.last_at,
           exists (select 1 from paying p where p.user_id = u.id) as pays
      from users u left join tx on tx.user_id = u.id
     where u.created_at >= now() - interval '30 days'
  )
  select jsonb_build_object(
    'generated_at', now(),
    'users_total', (select count(*) from users),
    'signups_today', (select count(*) from users where (created_at at time zone v_tz)::date = (now() at time zone v_tz)::date),
    'signups_7d', (select count(*) from users where created_at >= now() - interval '7 days'),
    'signups_30d', (select count(*) from users where created_at >= now() - interval '30 days'),
    'signups_daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::date, 'count', coalesce(c.n, 0)) order by d.day)
        from generate_series(((now() at time zone v_tz)::date - 13), (now() at time zone v_tz)::date, interval '1 day') as d(day)
        left join (
          select (created_at at time zone v_tz)::date as day, count(*) as n from users group by 1
        ) c on c.day = d.day::date
    ), '[]'::jsonb),
    'funnel', jsonb_build_object(
      'signed_up', (select count(*) from cohort),
      'whatsapp', (select count(*) from cohort where whatsapp),
      'first_entry', (select count(*) from cohort where first_at is not null),
      'active_d7', (select count(*) from cohort where created_at <= now() - interval '7 days' and last_at >= created_at + interval '7 days'),
      'eligible_d7', (select count(*) from cohort where created_at <= now() - interval '7 days'),
      'paying', (select count(*) from cohort where pays)
    ),
    'active', jsonb_build_object(
      'd1', (select count(*) from tx where last_at >= now() - interval '1 day'),
      'd7', (select count(*) from tx where last_at >= now() - interval '7 days'),
      'd30', (select count(*) from tx where last_at >= now() - interval '30 days')
    ),
    'profile', jsonb_build_object(
      'mei_configured', (select count(*) from public.mei_settings),
      'uses_business', (select count(*) from tx where has_business),
      'whatsapp_linked', (select count(*) from public.whatsapp_links)
    ),
    'channels_30d', jsonb_build_object(
      'entries_total', (select count(*) from public.transactions where created_at >= now() - interval '30 days'),
      'whatsapp_actions', (select count(*) from public.whatsapp_action_log where status = 'executed' and created_at >= now() - interval '30 days')
    ),
    'revenue', jsonb_build_object(
      'paying_month', (select count(*) from paying where coalesce(billing_interval, 'month') = 'month'),
      'paying_year', (select count(*) from paying where billing_interval = 'year'),
      'past_due', (select count(*) from paying where status = 'past_due'),
      'canceling', (select count(*) from paying where cancel_at_period_end),
      'canceled_this_month', (select count(*) from ent where status = 'canceled' and updated_at >= v_month_start),
      'manual_access', (select count(*) from ent where access_source = 'admin' and (current_period_end is null or current_period_end > now())),
      'mrr_cents', (
        (select count(*) from paying where coalesce(billing_interval, 'month') = 'month') * p_month_price_cents
        + (select count(*) from paying where billing_interval = 'year') * p_year_price_cents / 12
      )
    ),
    'costs', jsonb_build_object(
      'ai_requests_month', (select coalesce(sum(usage_count), 0) from public.usage_records where resource = 'ai_assistant' and period_start = v_month_start),
      'whatsapp_inbound_month', (select count(*) from public.whatsapp_processed_messages where created_at >= v_month_start),
      'whatsapp_actions_month', (select count(*) from public.whatsapp_action_log where created_at >= v_month_start)
    ),
    'health', jsonb_build_object(
      'whatsapp_failed_7d', (select count(*) from public.whatsapp_action_log where status = 'failed' and created_at >= now() - interval '7 days'),
      'whatsapp_stuck', (select count(*) from public.whatsapp_processed_messages where status = 'processing' and created_at < now() - interval '10 minutes'),
      'billing_events_30d', (select count(*) from public.billing_events where created_at >= now() - interval '30 days'),
      'last_billing_event', (select max(created_at) from public.billing_events),
      'rate_limited_1h', coalesce((
        select jsonb_agg(x order by (x->>'hits')::int desc) from (
          select jsonb_build_object('bucket', split_part(r.key, ':', 1), 'email', au.email, 'hits', r.hits) as x
            from public.rate_limits r
            left join auth.users au on au.id::text = split_part(r.key, ':', 2)
           where r.window_start >= now() - interval '1 hour'
           order by r.hits desc
           limit 5
        ) s
      ), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.ff_admin_overview(integer, integer) from public, anon, authenticated;
grant execute on function public.ff_admin_overview(integer, integer) to service_role;

-- 3) Lista de usuários com filtros (dados de conta e contagens, sem valores)
create or replace function public.ff_admin_users(
  p_search text default null,
  p_filter text default 'all',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  plan_id text,
  status text,
  access_source text,
  billing_interval text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  provider_customer_id text,
  whatsapp boolean,
  entries_count bigint,
  last_entry_at timestamptz,
  ai_used integer,
  ai_limit integer,
  is_mei boolean,
  total_count bigint
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      u.id as user_id,
      u.email::text as email,
      p.full_name,
      u.created_at,
      coalesce(e.plan_id, 'free') as plan_id,
      coalesce(e.status, 'beta') as status,
      coalesce(e.access_source, 'beta') as access_source,
      e.billing_interval,
      e.current_period_end,
      coalesce(e.cancel_at_period_end, false) as cancel_at_period_end,
      e.provider_customer_id,
      (w.user_id is not null) as whatsapp,
      coalesce(t.n, 0) as entries_count,
      t.last_at as last_entry_at,
      coalesce(ur.usage_count, 0) as ai_used,
      coalesce(pl.ai_monthly_limit, 0) as ai_limit,
      (m.user_id is not null or coalesce(t.has_business, false)) as is_mei
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.user_entitlements e on e.user_id = u.id
    left join public.plans pl on pl.id = coalesce(e.plan_id, 'free')
    left join public.whatsapp_links w on w.user_id = u.id
    left join public.mei_settings m on m.user_id = u.id
    left join lateral (
      select count(*) as n, max(tt.created_at) as last_at, bool_or(tt.scope = 'business') as has_business
        from public.transactions tt where tt.user_id = u.id
    ) t on true
    left join public.usage_records ur
      on ur.user_id = u.id and ur.resource = 'ai_assistant'
     and ur.period_start = date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date
  ),
  filtered as (
    select * from base b
     where (p_search is null or p_search = ''
            or b.email ilike '%' || p_search || '%'
            or coalesce(b.full_name, '') ilike '%' || p_search || '%')
       and case coalesce(p_filter, 'all')
         when 'not_activated' then b.entries_count = 0
         when 'manual_expiring' then b.access_source = 'admin'
              and b.current_period_end between now() and now() + interval '3 days'
         when 'paying_idle' then b.access_source = 'subscription' and b.status in ('active', 'past_due')
              and (b.last_entry_at is null or b.last_entry_at < now() - interval '7 days')
         when 'paying' then b.access_source = 'subscription' and b.status in ('active', 'past_due')
         when 'manual' then b.access_source = 'admin'
         when 'mei' then b.is_mei
         else true
       end
  )
  select f.*, count(*) over () as total_count
    from filtered f
   order by f.created_at desc
   limit greatest(1, least(coalesce(p_limit, 50), 200))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.ff_admin_users(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.ff_admin_users(text, text, integer, integer) to service_role;
