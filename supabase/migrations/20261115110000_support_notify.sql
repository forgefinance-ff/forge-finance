-- Forge Finance: aviso para a equipe quando chega mensagem de suporte.
-- 1) ff_support_send passa a dizer se é a 1ª mensagem não lida da conversa
--    (só essa gera aviso, para não mandar um WhatsApp por mensagem).
-- 2) ff_admin_whatsapp_phones: números de WhatsApp conectados dos admins.
-- Idempotente: pode rodar mais de uma vez. Não apaga dados.

-- Último aviso enviado (no máximo um a cada 15 min por conversa).
alter table public.support_threads add column if not exists notified_at timestamptz;

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
  v_unread integer;
  v_recent integer;
  v_notify boolean := false;
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
  returning id, unread_admin into v_thread, v_unread;

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

  -- Avisa a equipe só na 1ª mensagem não lida e, no máximo, a cada 15 minutos.
  if v_unread = 1 then
    update public.support_threads
       set notified_at = now()
     where id = v_thread
       and (notified_at is null or notified_at < now() - interval '15 minutes')
    returning true into v_notify;
  end if;

  return jsonb_build_object('id', v_msg.id, 'created_at', v_msg.created_at, 'notify', coalesce(v_notify, false));
end;
$$;

revoke all on function public.ff_support_send(text, text) from public, anon;
grant execute on function public.ff_support_send(text, text) to authenticated;

-- Números de WhatsApp (conectados no app) dos e-mails de admin.
create or replace function public.ff_admin_whatsapp_phones(p_emails text[])
returns table (email text, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select lower(u.email)::text, w.phone
    from auth.users u
    join public.whatsapp_links w on w.user_id = u.id
   where lower(u.email) = any (select lower(btrim(e)) from unnest(p_emails) e);
$$;

revoke all on function public.ff_admin_whatsapp_phones(text[]) from public, anon, authenticated;
grant execute on function public.ff_admin_whatsapp_phones(text[]) to service_role;
