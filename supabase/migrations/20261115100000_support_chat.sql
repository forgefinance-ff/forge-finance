-- Forge Finance: chat de suporte com a equipe (balão -> /admin/suporte).
-- Uma conversa por usuário. O usuário só lê/escreve pelas funções abaixo
-- (sempre a própria conversa, via auth.uid()). A equipe usa a service role.
-- Idempotente: pode rodar mais de uma vez.

create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_sender text not null default 'user' check (last_sender in ('user', 'admin')),
  last_message_at timestamptz not null default now(),
  unread_admin integer not null default 0 check (unread_admin >= 0),
  unread_user integer not null default 0 check (unread_user >= 0),
  last_page text,
  created_at timestamptz not null default now()
);
create index if not exists support_threads_inbox_idx on public.support_threads (status, last_message_at desc);

create table if not exists public.support_messages (
  id bigint generated always as identity primary key,
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  admin_email text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_thread_idx on public.support_messages (thread_id, id);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_threads from public, anon, authenticated;
revoke all on public.support_messages from public, anon, authenticated;

-- Usuário manda mensagem para a equipe (cria ou reabre a conversa).
create or replace function public.ff_support_send(p_body text, p_page text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_thread uuid;
  v_recent integer;
  v_msg public.support_messages;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'invalid_body' using errcode = '22023';
  end if;

  insert into public.support_threads as t (user_id, status, last_sender, last_message_at, unread_admin, last_page)
  values (v_uid, 'open', 'user', now(), 1, left(p_page, 200))
  on conflict (user_id) do update
    set status = 'open',
        last_sender = 'user',
        last_message_at = now(),
        unread_admin = t.unread_admin + 1,
        last_page = coalesce(left(p_page, 200), t.last_page)
  returning id into v_thread;

  -- Anti-abuso: no máximo 20 mensagens em 10 minutos.
  select count(*) into v_recent
    from public.support_messages
   where thread_id = v_thread and sender = 'user' and created_at > now() - interval '10 minutes';
  if v_recent >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.support_messages (thread_id, sender, body)
  values (v_thread, 'user', v_body)
  returning * into v_msg;

  return jsonb_build_object('id', v_msg.id, 'created_at', v_msg.created_at);
end;
$$;

-- Usuário lê a própria conversa (últimas 100) e marca as respostas como lidas.
create or replace function public.ff_support_my_thread()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_thread public.support_threads;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_thread from public.support_threads where user_id = v_uid;
  if not found then
    return null;
  end if;

  update public.support_threads set unread_user = 0 where id = v_thread.id and unread_user > 0;

  return jsonb_build_object(
    'status', v_thread.status,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'sender', m.sender, 'body', m.body, 'created_at', m.created_at) order by m.id)
        from (
          select * from public.support_messages
           where thread_id = v_thread.id
           order by id desc
           limit 100
        ) m
    ), '[]'::jsonb)
  );
end;
$$;

-- Quantas respostas da equipe o usuário ainda não viu (para a bolinha no balão).
create or replace function public.ff_support_unread()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select unread_user from public.support_threads where user_id = auth.uid()), 0);
$$;

revoke all on function public.ff_support_send(text, text) from public, anon;
revoke all on function public.ff_support_my_thread() from public, anon;
revoke all on function public.ff_support_unread() from public, anon;
grant execute on function public.ff_support_send(text, text) to authenticated;
grant execute on function public.ff_support_my_thread() to authenticated;
grant execute on function public.ff_support_unread() to authenticated;

-- Caixa de entrada da equipe (só service role).
create or replace function public.ff_admin_support_threads(p_status text default 'open')
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  status text,
  last_sender text,
  last_message_at timestamptz,
  unread_admin integer,
  last_page text,
  preview text,
  plan_label text
)
language sql
security definer
set search_path = public
as $$
  select
    t.id, t.user_id, u.email::text, p.full_name, t.status, t.last_sender, t.last_message_at,
    t.unread_admin, t.last_page,
    (select left(m.body, 140) from public.support_messages m where m.thread_id = t.id order by m.id desc limit 1),
    case
      when e.access_source = 'subscription' and e.status in ('active', 'past_due') then 'Pro'
      when e.access_source = 'admin' then 'Pro liberado'
      else 'Free'
    end
  from public.support_threads t
  join auth.users u on u.id = t.user_id
  left join public.profiles p on p.id = t.user_id
  left join public.user_entitlements e on e.user_id = t.user_id
  where p_status = 'all' or t.status = p_status
  order by (t.unread_admin > 0) desc, t.last_message_at desc
  limit 200;
$$;

revoke all on function public.ff_admin_support_threads(text) from public, anon, authenticated;
grant execute on function public.ff_admin_support_threads(text) to service_role;
