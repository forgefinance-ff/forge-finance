-- Forge Finance: teste grátis de 30 dias do Pro (a partir do cadastro) e
-- preferência do resumo do mês no WhatsApp.
-- Idempotente: pode rodar mais de uma vez. Não apaga dados.

-- 1) Fim do teste grátis em cada conta
alter table public.user_entitlements
  add column if not exists trial_ends_at timestamptz;

create or replace function public.ff_set_trial_ends_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trial_ends_at is null then
    select u.created_at + interval '30 days' into new.trial_ends_at
      from auth.users u where u.id = new.user_id;
    new.trial_ends_at := coalesce(new.trial_ends_at, now() + interval '30 days');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_user_entitlements_trial on public.user_entitlements;
create trigger trg_user_entitlements_trial
  before insert on public.user_entitlements
  for each row execute function public.ff_set_trial_ends_at();

-- Contas que já existem: 30 dias a partir do cadastro de cada uma.
update public.user_entitlements e
   set trial_ends_at = u.created_at + interval '30 days'
  from auth.users u
 where u.id = e.user_id and e.trial_ends_at is null;

-- 2) Resumo do mês no WhatsApp (ligado por padrão)
alter table public.notification_prefs
  add column if not exists monthly_summary boolean not null default true;

-- 3) Cota de IA: no teste grátis vale o limite do Pro
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
  effective_plan text;
  trial_end timestamptz;
begin
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.user_entitlements (user_id, plan_id, status, access_source)
  values (current_user_id, 'free', 'beta', 'beta')
  on conflict (user_id) do nothing;

  select p.ai_monthly_limit, e.status, e.plan_id, e.trial_ends_at
    into effective_limit, effective_status, effective_plan, trial_end
  from public.user_entitlements e
  join public.plans p on p.id = e.plan_id
  where e.user_id = current_user_id;

  if effective_plan = 'free' and trial_end is not null and trial_end > now() then
    select p.ai_monthly_limit into effective_limit from public.plans p where p.id = 'pro';
  end if;

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
