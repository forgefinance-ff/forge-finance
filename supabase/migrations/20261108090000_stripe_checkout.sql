-- Forge Finance: assinatura Forge Pro (Stripe), "Desfazer" no WhatsApp e
-- aviso de plano para quem não assina.
-- Idempotente: pode rodar mais de uma vez.

-- =====================================================
-- 1) PLANOS: Free + Forge Pro (Plus e Business saem de venda)
-- =====================================================

insert into public.plans (id, name, description, monthly_price_cents, ai_monthly_limit, features, is_active)
values (
  'pro',
  'Forge Pro',
  'Tudo liberado: registro pelo WhatsApp, Pessoal + Empresa e IA ampliada.',
  1990,
  100,
  '{"dashboard":true,"transactions":true,"accounts":true,"cards":true,"categories":true,"investments":true,"goals":true,"basic_reports":true,"basic_ai_insights":true,"assistant":true,"advanced_ai":true,"whatsapp":true,"business_workspace":true}'::jsonb,
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
   set features = features || '{"whatsapp":false}'::jsonb,
       updated_at = now()
 where id = 'free';

-- Mantidos para não quebrar referências antigas, mas fora de venda.
update public.plans
   set is_active = false,
       updated_at = now()
 where id in ('plus', 'business');

-- =====================================================
-- 2) DADOS DA ASSINATURA
-- =====================================================

alter table public.user_entitlements
  add column if not exists billing_interval text,
  add column if not exists cancel_at_period_end boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_entitlements_billing_interval_check'
  ) then
    alter table public.user_entitlements
      add constraint user_entitlements_billing_interval_check
      check (billing_interval is null or billing_interval in ('month', 'year'));
  end if;
end $$;

create unique index if not exists user_entitlements_provider_customer_idx
  on public.user_entitlements (provider_customer_id)
  where provider_customer_id is not null;

-- Eventos do Stripe já processados (o Stripe pode reenviar o mesmo evento).
create table if not exists public.billing_events (
  id text primary key,
  type text not null,
  created_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
comment on table public.billing_events is 'Idempotência dos webhooks do Stripe. Só o servidor (service role) escreve.';

-- A cota de IA passa a depender só do plano: quem cancela volta para o Free
-- (10 consultas) em vez de perder o assistente. Só "suspended" bloqueia.
create or replace function public.consume_my_ai_quota()
returns table (allowed boolean, used integer, monthly_limit integer, remaining integer, period_start date)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  effective_limit integer;
  current_period date := date_trunc('month', now() at time zone 'UTC')::date;
  new_count integer;
  effective_status text;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.user_entitlements (user_id, plan_id, status, access_source)
  values (current_user_id, 'free', 'beta', 'beta')
  on conflict (user_id) do nothing;

  select p.ai_monthly_limit, e.status
    into effective_limit, effective_status
  from public.user_entitlements e
  join public.plans p on p.id = e.plan_id
  where e.user_id = current_user_id;

  if effective_limit is null or effective_status = 'suspended' then
    return query select false, 0, coalesce(effective_limit, 0), 0, current_period;
    return;
  end if;

  insert into public.usage_records (user_id, resource, period_start, usage_count)
  values (current_user_id, 'ai_assistant', current_period, 1)
  on conflict (user_id, resource, period_start)
  do update set usage_count = usage_records.usage_count + 1, updated_at = now()
  where public.usage_records.usage_count < effective_limit
  returning usage_count into new_count;

  if new_count is null then
    select u.usage_count into new_count
    from public.usage_records u
    where u.user_id = current_user_id and u.resource = 'ai_assistant' and u.period_start = current_period;
    return query select false, coalesce(new_count, 0), effective_limit, greatest(effective_limit - coalesce(new_count, 0), 0), current_period;
  else
    return query select true, new_count, effective_limit, greatest(effective_limit - new_count, 0), current_period;
  end if;
end;
$$;
revoke all on function public.consume_my_ai_quota() from public, anon;
grant execute on function public.consume_my_ai_quota() to authenticated;

-- =====================================================
-- 3) WHATSAPP: "Desfazer" e aviso de plano
-- =====================================================

-- Lançamentos gravados direto pelo bot que ainda podem ser desfeitos (24h).
create table if not exists public.whatsapp_undo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  transaction_ids uuid[] not null,
  summary text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);
create index if not exists whatsapp_undo_user_idx on public.whatsapp_undo (user_id, created_at desc);
alter table public.whatsapp_undo enable row level security;
comment on table public.whatsapp_undo is 'Lançamentos do bot que podem ser desfeitos. Só o servidor (service role) acessa.';

-- Evita mandar o aviso "WhatsApp é do Forge Pro" mais de uma vez por dia
-- (cada mensagem do bot tem custo na Meta).
create table if not exists public.whatsapp_paywall_notices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_sent_at timestamptz not null default now()
);
alter table public.whatsapp_paywall_notices enable row level security;
comment on table public.whatsapp_paywall_notices is 'Último aviso de plano enviado pelo bot. Só o servidor (service role) acessa.';
