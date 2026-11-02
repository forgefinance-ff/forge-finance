-- Forge Finance: Fase 2 do MEI — clientes (sempre no escopo Empresa).
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default 'business' check (scope = 'business'),
  name text not null check (length(trim(name)) between 1 and 120),
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  email text check (email is null or length(email) <= 160),
  notes text check (notes is null or length(notes) <= 1000),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customers_user_idx
  on public.customers (user_id, archived_at, name);

alter table public.customers enable row level security;

drop policy if exists "customers_own" on public.customers;
create policy "customers_own"
  on public.customers
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
