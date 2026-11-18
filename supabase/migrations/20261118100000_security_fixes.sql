-- Correções da auditoria de segurança (18/11/2026). Idempotente.
--
-- 1) Devolução da cota de IA e limite de requisições passam a ser só do
--    servidor (service role), com o user_id explícito. Antes, qualquer
--    usuário logado chamava refund_my_ai_quota/ff_rate_limit direto pelo
--    PostgREST e zerava a própria cota e o próprio limite.
-- 2) Tabelas filhas da agenda passam a exigir que o evento seja do mesmo dono.

-- =====================================================
-- 1a) DEVOLUÇÃO DA COTA DE IA (só servidor)
-- =====================================================

revoke all on function public.refund_my_ai_quota() from public, anon, authenticated;

create or replace function public.ff_refund_ai_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user_required' using errcode = '22023';
  end if;

  update public.usage_records
     set usage_count = greatest(usage_count - 1, 0), updated_at = now()
   where user_id = p_user_id
     and resource = 'ai_assistant'
     and period_start = date_trunc('month', now() at time zone 'UTC')::date;
end;
$$;

revoke all on function public.ff_refund_ai_quota(uuid) from public, anon, authenticated;
grant execute on function public.ff_refund_ai_quota(uuid) to service_role;

-- =====================================================
-- 1b) LIMITE DE REQUISIÇÕES (só servidor)
-- =====================================================

revoke all on function public.ff_rate_limit(text, integer, integer) from public, anon, authenticated;

-- p_subject: id do usuário, telefone ou 'global'. true = pode seguir.
create or replace function public.ff_rate_limit_for(
  p_subject text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_hits integer;
begin
  if p_bucket !~ '^[a-z_]{1,40}$' then
    raise exception 'invalid_bucket' using errcode = '22023';
  end if;
  if p_subject is null or p_subject !~ '^[A-Za-z0-9_-]{1,64}$' then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;
  if p_limit is null or p_limit < 1 or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;

  v_key := p_bucket || ':' || p_subject;

  insert into public.rate_limits as r (key, window_start, hits)
  values (v_key, now(), 1)
  on conflict (key) do update
     set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
         window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.ff_rate_limit_for(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.ff_rate_limit_for(text, text, integer, integer) to service_role;

-- Linhas antigas criadas com buckets arbitrários pelo caminho antigo.
delete from public.rate_limits where window_start < now() - interval '2 days';

-- =====================================================
-- 2) AGENDA: FILHOS SÓ DE EVENTOS DO MESMO DONO
-- =====================================================

create or replace function public.ff_event_child_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.events e where e.id = new.event_id and e.user_id = new.user_id) then
    raise exception 'Evento não encontrado.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function public.ff_event_exception_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.events e where e.id = new.event_id and e.user_id = new.user_id) then
    raise exception 'Evento não encontrado.' using errcode = '23514';
  end if;
  if new.override_event_id is not null
     and not exists (select 1 from public.events e where e.id = new.override_event_id and e.user_id = new.user_id) then
    raise exception 'Evento não encontrado.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists ff_event_attendees_guard on public.event_attendees;
create trigger ff_event_attendees_guard
  before insert or update of event_id, user_id on public.event_attendees
  for each row execute function public.ff_event_child_guard();

drop trigger if exists ff_event_reminders_guard on public.event_reminders;
create trigger ff_event_reminders_guard
  before insert or update of event_id, user_id on public.event_reminders
  for each row execute function public.ff_event_child_guard();

drop trigger if exists ff_event_exceptions_guard on public.event_recurrence_exceptions;
create trigger ff_event_exceptions_guard
  before insert or update of event_id, override_event_id, user_id on public.event_recurrence_exceptions
  for each row execute function public.ff_event_exception_guard();
