-- =====================================================
-- EXTENSÕES
-- =====================================================

create extension if not exists "pgcrypto";

-- =====================================================
-- UPDATED_AT
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- PROFILES
-- =====================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================
-- ACCOUNTS
-- =====================================================

create table if not exists public.accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,

    name text not null,
    type text not null,
    color text default '#3B82F6',

    initial_balance numeric(14,2) default 0,
    current_balance numeric(14,2) default 0,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================
-- CATEGORIES
-- =====================================================

create table if not exists public.categories (

    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,

    name text not null,

    type text not null check(type in ('income','expense')),

    color text,

    icon text,

    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================
-- TRANSACTIONS
-- =====================================================

create table if not exists public.transactions (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id) on delete cascade,

    account_id uuid references public.accounts(id) on delete set null,

    category_id uuid references public.categories(id) on delete set null,

    type text not null check(type in ('income','expense','transfer')),

    title text not null,

    description text,

    amount numeric(14,2) not null,

    transaction_date date not null,

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);

-- =====================================================
-- CARDS
-- =====================================================

create table if not exists public.cards (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id) on delete cascade,

    name text not null,

    limit_amount numeric(14,2),

    closing_day integer,

    due_day integer,

    color text,

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);

-- =====================================================
-- GOALS
-- =====================================================

create table if not exists public.goals (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id) on delete cascade,

    title text not null,

    target_amount numeric(14,2),

    current_amount numeric(14,2) default 0,

    deadline date,

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);

-- =====================================================
-- INVESTMENTS
-- =====================================================

create table if not exists public.investments (

    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references auth.users(id) on delete cascade,

    name text not null,

    type text,

    invested_amount numeric(14,2),

    current_value numeric(14,2),

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);

-- =====================================================
-- TRIGGERS
-- =====================================================

create trigger trg_profiles_updated
before update on public.profiles
for each row execute function handle_updated_at();

create trigger trg_accounts_updated
before update on public.accounts
for each row execute function handle_updated_at();

create trigger trg_categories_updated
before update on public.categories
for each row execute function handle_updated_at();

create trigger trg_transactions_updated
before update on public.transactions
for each row execute function handle_updated_at();

create trigger trg_cards_updated
before update on public.cards
for each row execute function handle_updated_at();

create trigger trg_goals_updated
before update on public.goals
for each row execute function handle_updated_at();

create trigger trg_investments_updated
before update on public.investments
for each row execute function handle_updated_at();

-- =====================================================
-- RLS
-- =====================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.cards enable row level security;
alter table public.goals enable row level security;
alter table public.investments enable row level security;

-- =====================================================
-- POLICIES
-- =====================================================

create policy "profiles"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "accounts"
on public.accounts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "categories"
on public.categories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "transactions"
on public.transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "cards"
on public.cards
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "goals"
on public.goals
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "investments"
on public.investments
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);