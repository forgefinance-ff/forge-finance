-- Forge Finance: catálogo de planos, acesso beta e cotas de IA.
-- Não cria cobranças nem integra gateways de pagamento.

create table if not exists public.plans (
  id text primary key,
  name text not null,
  description text not null default '',
  monthly_price_cents integer not null default 0 check (monthly_price_cents >= 0),
  ai_monthly_limit integer not null default 0 check (ai_monthly_limit >= 0),
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  status text not null default 'beta' check (status in ('beta', 'active', 'past_due', 'canceled', 'suspended')),
  access_source text not null default 'beta' check (access_source in ('beta', 'subscription', 'admin')),
  billing_provider text check (billing_provider is null or billing_provider in ('mercadopago', 'stripe')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.usage_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource text not null,
  period_start date not null,
  usage_count integer not null default 0 check (usage_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, resource, period_start)
);

create index if not exists usage_records_period_idx on public.usage_records (period_start, resource);

alter table public.plans enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.usage_records enable row level security;

-- Usuários podem consultar o catálogo ativo, mas não editá-lo.
drop policy if exists "Authenticated users can read active plans" on public.plans;
create policy "Authenticated users can read active plans"
  on public.plans for select to authenticated using (is_active = true);

-- Usuários podem ler apenas o próprio acesso; não há policy de escrita para authenticated.
drop policy if exists "Users can read their own entitlements" on public.user_entitlements;
create policy "Users can read their own entitlements"
  on public.user_entitlements for select to authenticated using (auth.uid() = user_id);

-- Consumo pode ser lido apenas pelo próprio usuário. Escritas são feitas por RPC.
drop policy if exists "Users can read their own usage" on public.usage_records;
create policy "Users can read their own usage"
  on public.usage_records for select to authenticated using (auth.uid() = user_id);

insert into public.plans (id, name, description, monthly_price_cents, ai_monthly_limit, features, is_active)
values
  ('free', 'Forge Free', 'O essencial para organizar suas finanças.', 0, 10,
   '{"dashboard":true,"transactions":true,"accounts":true,"cards":true,"categories":true,"investments":true,"goals":true,"basic_reports":true,"basic_ai_insights":true,"assistant":true}'::jsonb, true),
  ('plus', 'Forge Plus', 'Inteligência financeira ampliada. Plano futuro, sem cobrança no beta.', 1990, 100,
   '{"dashboard":true,"transactions":true,"accounts":true,"cards":true,"categories":true,"investments":true,"goals":true,"basic_reports":true,"advanced_ai":true,"assistant":true,"projections":true}'::jsonb, true),
  ('business', 'Forge Business', 'Recursos para pequenos negócios. Plano futuro, sem cobrança no beta.', 7990, 250,
   '{"dashboard":true,"transactions":true,"accounts":true,"cards":true,"categories":true,"investments":true,"goals":true,"basic_reports":true,"advanced_ai":true,"assistant":true,"business_workspace":false,"cost_centers":false}'::jsonb, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  monthly_price_cents = excluded.monthly_price_cents,
  ai_monthly_limit = excluded.ai_monthly_limit,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();

-- Provisiona novos usuários no beta gratuito. Idempotente e sem permitir escolha do plano pelo cliente.
create or replace function public.provision_beta_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_entitlements (user_id, plan_id, status, access_source)
  values (new.id, 'free', 'beta', 'beta')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.provision_beta_entitlement() from public, anon, authenticated;
drop trigger if exists trg_provision_beta_entitlement on auth.users;
create trigger trg_provision_beta_entitlement
after insert on auth.users
for each row execute function public.provision_beta_entitlement();

-- Backfill idempotente para contas já existentes.
insert into public.user_entitlements (user_id, plan_id, status, access_source)
select id, 'free', 'beta', 'beta' from auth.users
on conflict (user_id) do nothing;

-- Recupera provisionamento ausente para o usuário atual sem conceder acesso elevado.
create or replace function public.ensure_my_beta_entitlement()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  insert into public.user_entitlements (user_id, plan_id, status, access_source)
  values (current_user_id, 'free', 'beta', 'beta')
  on conflict (user_id) do nothing;
end;
$$;
revoke all on function public.ensure_my_beta_entitlement() from public, anon;
grant execute on function public.ensure_my_beta_entitlement() to authenticated;

-- Incremento atômico: a cota é resolvida pelo banco, não pelo cliente.
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
  join public.plans p on p.id = e.plan_id and p.is_active = true
  where e.user_id = current_user_id;

  if effective_limit is null or effective_status not in ('beta', 'active') then
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

-- SECURITY DEFINER não deve ficar acessível a papéis não autenticados.
comment on table public.user_entitlements is 'Permissões comerciais por usuário. Escrita reservada a funções confiáveis; durante o beta, acesso gratuito.';
comment on table public.usage_records is 'Contadores atômicos de consumo por usuário, recurso e mês UTC.';
