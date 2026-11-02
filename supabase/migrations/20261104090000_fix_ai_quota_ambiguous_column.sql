-- Corrige consume_my_ai_quota(): a coluna de saída "period_start" (RETURNS TABLE)
-- vira variável PL/pgSQL e colide com usage_records.period_start no ON CONFLICT,
-- gerando 42702 "column reference is ambiguous" em toda chamada.
-- Idempotente: só recria a função, reaplica permissões e garante o acesso beta.

create or replace function public.consume_my_ai_quota()
returns table (allowed boolean, used integer, monthly_limit integer, remaining integer, period_start date)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
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

  insert into public.usage_records as ur (user_id, resource, period_start, usage_count)
  values (current_user_id, 'ai_assistant', current_period, 1)
  on conflict on constraint usage_records_pkey
  do update set usage_count = ur.usage_count + 1, updated_at = now()
  where ur.usage_count < effective_limit
  returning ur.usage_count into new_count;

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

-- Garante registro beta para contas criadas antes do trigger.
insert into public.user_entitlements (user_id, plan_id, status, access_source)
select id, 'free', 'beta', 'beta' from auth.users
on conflict (user_id) do nothing;
