-- Forge Finance: registro de gastos via WhatsApp
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.

create table if not exists public.whatsapp_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  default_account_id uuid references public.accounts(id) on delete set null,
  verified_at timestamptz not null default now()
);

create table if not exists public.whatsapp_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists public.whatsapp_pending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

create table if not exists public.whatsapp_processed_messages (
  wamid text primary key,
  phone text not null,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_pending_phone_idx
  on public.whatsapp_pending (phone, created_at desc);
create index if not exists whatsapp_processed_phone_idx
  on public.whatsapp_processed_messages (phone, created_at);

alter table public.whatsapp_links enable row level security;
alter table public.whatsapp_link_codes enable row level security;
alter table public.whatsapp_pending enable row level security;
alter table public.whatsapp_processed_messages enable row level security;

-- O usuario so enxerga/remove o proprio vinculo.
-- As demais tabelas ficam sem policy: so o servidor (service role) acessa.
drop policy if exists "whatsapp_links_select_own" on public.whatsapp_links;
create policy "whatsapp_links_select_own" on public.whatsapp_links
  for select using (auth.uid() = user_id);

drop policy if exists "whatsapp_links_delete_own" on public.whatsapp_links;
create policy "whatsapp_links_delete_own" on public.whatsapp_links
  for delete using (auth.uid() = user_id);
