-- Forge Finance: planos Forge Pessoal (R$ 19,90) e Forge MEI (R$ 29,90).
-- O id 'pro' passa a ser o Forge MEI, então quem já tinha o Pro continua com
-- Pessoal + Empresa. Idempotente: pode rodar mais de uma vez. Não apaga dados.

-- 1) Catálogo
insert into public.plans (id, name, description, monthly_price_cents, ai_monthly_limit, features, is_active)
values (
  'pessoal',
  'Forge Pessoal',
  'Finanças pessoais pelo app e pelo WhatsApp.',
  1990,
  100,
  '{"dashboard":true,"transactions":true,"accounts":true,"cards":true,"categories":true,"investments":true,"goals":true,"basic_reports":true,"basic_ai_insights":true,"assistant":true,"advanced_ai":true,"whatsapp":true,"business_workspace":false}'::jsonb,
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  ai_monthly_limit = excluded.ai_monthly_limit,
  features = excluded.features,
  is_active = true,
  updated_at = now();

update public.plans
   set name = 'Forge MEI',
       description = 'Pessoal e Empresa no mesmo lugar, pelo app e pelo WhatsApp.',
       monthly_price_cents = 2990,
       updated_at = now()
 where id = 'pro';

-- 2) Painel admin: receita somando os dois planos pagos.
-- A versão antiga, de 2 argumentos, fica até o código novo estar publicado.
create or replace function public.ff_admin_overview(
  p_month_price_cents integer,
  p_year_price_cents integer,
  p_pessoal_month_price_cents integer,
  p_pessoal_year_price_cents integer
)
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
     where plan_id in ('pessoal', 'pro') and access_source = 'subscription' and status in ('active', 'past_due')
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
        (select count(*) from paying where plan_id = 'pro' and coalesce(billing_interval, 'month') = 'month') * p_month_price_cents
        + (select count(*) from paying where plan_id = 'pro' and billing_interval = 'year') * p_year_price_cents / 12
        + (select count(*) from paying where plan_id = 'pessoal' and coalesce(billing_interval, 'month') = 'month') * p_pessoal_month_price_cents
        + (select count(*) from paying where plan_id = 'pessoal' and billing_interval = 'year') * p_pessoal_year_price_cents / 12
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

revoke all on function public.ff_admin_overview(integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.ff_admin_overview(integer, integer, integer, integer) to service_role;
