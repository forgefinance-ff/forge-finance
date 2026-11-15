-- Forge Finance: conta as mensagens que o bot ENVIA (é o que a Meta cobra).
-- Um contador por dia e tipo (texto/botão = "service", modelo = "template").
-- Só a service role escreve e lê. Idempotente.

create table if not exists public.whatsapp_outbound_daily (
  day date not null,
  kind text not null check (kind in ('service', 'template')),
  sent integer not null default 0,
  failed integer not null default 0,
  primary key (day, kind)
);
alter table public.whatsapp_outbound_daily enable row level security;
revoke all on public.whatsapp_outbound_daily from public, anon, authenticated;

create or replace function public.ff_wa_outbound_inc(p_kind text, p_ok boolean)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.whatsapp_outbound_daily as o (day, kind, sent, failed)
  values ((now() at time zone 'America/Sao_Paulo')::date, p_kind, case when p_ok then 1 else 0 end, case when p_ok then 0 else 1 end)
  on conflict (day, kind) do update
    set sent = o.sent + excluded.sent,
        failed = o.failed + excluded.failed;
$$;

revoke all on function public.ff_wa_outbound_inc(text, boolean) from public, anon, authenticated;
grant execute on function public.ff_wa_outbound_inc(text, boolean) to service_role;
