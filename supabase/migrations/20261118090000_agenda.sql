-- Forge Finance: Agenda (fase 1).
-- Idempotente. Não altera tabelas antigas.
--
-- Decisões:
-- * Tarefas são eventos com kind = 'task' (mesma data, recorrência, lembrete e
--   consulta por intervalo; um só índice e uma só leitura por tela).
-- * Eventos financeiros (contas a pagar/receber, cobranças, DAS, DASN) NÃO são
--   copiados para cá: o app consulta as tabelas financeiras na hora.
-- * Datas em timestamptz (UTC). Evento de dia inteiro: início = 00:00 do primeiro
--   dia no fuso do usuário; fim = 00:00 do dia seguinte ao último (exclusivo).
-- * Recorrência (fase 2): regra RRULE em events.rrule + tabela de exceções.

-- =====================================================
-- 1) AGENDAS
-- =====================================================

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'personal' check (scope in ('personal', 'business')),
  -- 'custom' = criada pelo usuário ou padrão; 'financial' = eventos automáticos (só liga/desliga e cor).
  kind text not null default 'custom' check (kind in ('custom', 'financial')),
  name text not null check (length(trim(name)) between 1 and 60),
  color text not null default 'violeta' check (color ~ '^[a-z]{3,12}$'),
  is_visible boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Uma agenda financeira por escopo.
create unique index if not exists calendars_financial_unique
  on public.calendars (user_id, scope) where kind = 'financial';

create index if not exists calendars_user_idx on public.calendars (user_id, scope, position);

alter table public.calendars enable row level security;

drop policy if exists "calendars_own" on public.calendars;
create policy "calendars_own" on public.calendars
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================
-- 2) EVENTOS E TAREFAS
-- =====================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  -- Copiado da agenda pelo gatilho abaixo (filtro Pessoal x Empresa sem join).
  scope text not null default 'personal' check (scope in ('personal', 'business')),
  kind text not null default 'event' check (kind in ('event', 'task')),
  title text not null check (length(trim(title)) between 1 and 200),
  description text check (description is null or length(description) <= 5000),
  location text check (location is null or length(location) <= 300),
  meeting_url text check (meeting_url is null or (meeting_url ~ '^https://' and length(meeting_url) <= 500)),
  color text check (color is null or color ~ '^[a-z]{3,12}$'),
  all_day boolean not null default false,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- Tarefas
  task_done boolean not null default false,
  task_done_at timestamptz,
  -- Recorrência (fase 2): RRULE sem DTSTART (o início é starts_at).
  rrule text check (rrule is null or length(rrule) <= 500),
  -- Fim da série (null = sem fim), para buscar só as séries que alcançam a tela.
  recurrence_until timestamptz,
  source text not null default 'app' check (source in ('app', 'whatsapp', 'ics')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at >= starts_at)
);

-- Consulta por intervalo: eventos simples que cruzam [início, fim) da tela.
create index if not exists events_user_range_idx
  on public.events (user_id, starts_at, ends_at) where rrule is null;
-- Séries recorrentes: poucas por usuário; expandidas no servidor só para a tela.
create index if not exists events_user_recurring_idx
  on public.events (user_id, recurrence_until) where rrule is not null;
create index if not exists events_calendar_idx on public.events (calendar_id);

alter table public.events enable row level security;

drop policy if exists "events_own" on public.events;
create policy "events_own" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A agenda tem que ser do mesmo usuário e não pode ser a financeira;
-- o escopo do evento é sempre o da agenda.
create or replace function public.ff_events_calendar_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  cal record;
begin
  select user_id, scope, kind into cal from public.calendars where id = new.calendar_id;
  if not found or cal.user_id <> new.user_id then
    raise exception 'Agenda não encontrada.' using errcode = '23503';
  end if;
  if cal.kind <> 'custom' then
    raise exception 'A agenda financeira é automática: escolha outra agenda.' using errcode = '23514';
  end if;
  new.scope := cal.scope;
  new.updated_at := now();
  if new.kind = 'task' and new.task_done and new.task_done_at is null then
    new.task_done_at := now();
  elsif not new.task_done then
    new.task_done_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_events_calendar_guard on public.events;
create trigger trg_events_calendar_guard
  before insert or update on public.events
  for each row execute function public.ff_events_calendar_guard();

-- Mudar a agenda de escopo arrasta os eventos junto.
create or replace function public.ff_calendars_scope_sync()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.scope <> old.scope then
    update public.events set scope = new.scope where calendar_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_calendars_scope_sync on public.calendars;
create trigger trg_calendars_scope_sync
  after update of scope on public.calendars
  for each row execute function public.ff_calendars_scope_sync();

-- =====================================================
-- 3) EXCEÇÕES DE RECORRÊNCIA (fase 2: "só este" / "este e os seguintes")
-- =====================================================

create table if not exists public.event_recurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  -- Início original da ocorrência que mudou.
  original_start timestamptz not null,
  -- true = ocorrência apagada; false = substituída por override_event_id.
  cancelled boolean not null default true,
  override_event_id uuid references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint event_exceptions_unique unique (event_id, original_start)
);

alter table public.event_recurrence_exceptions enable row level security;

drop policy if exists "event_exceptions_own" on public.event_recurrence_exceptions;
create policy "event_exceptions_own" on public.event_recurrence_exceptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================
-- 4) LEMBRETES (fase 3: push e WhatsApp)
-- =====================================================

create table if not exists public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  minutes_before integer not null check (minutes_before between 0 and 40320),
  channel text not null default 'push' check (channel in ('push', 'whatsapp')),
  -- Início da última ocorrência já avisada (evita aviso duplicado em séries).
  last_sent_for timestamptz,
  created_at timestamptz not null default now(),
  constraint event_reminders_unique unique (event_id, minutes_before, channel)
);

create index if not exists event_reminders_event_idx on public.event_reminders (event_id);

alter table public.event_reminders enable row level security;

drop policy if exists "event_reminders_own" on public.event_reminders;
create policy "event_reminders_own" on public.event_reminders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================
-- 5) CONVIDADOS (só registrados; nada é enviado a eles por enquanto)
-- =====================================================

create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  email text check (email is null or (length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  created_at timestamptz not null default now()
);

create index if not exists event_attendees_event_idx on public.event_attendees (event_id);

alter table public.event_attendees enable row level security;

drop policy if exists "event_attendees_own" on public.event_attendees;
create policy "event_attendees_own" on public.event_attendees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
