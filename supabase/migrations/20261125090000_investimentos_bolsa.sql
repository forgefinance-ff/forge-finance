-- Forge Finance: Investimentos com cotação automática (ações, FIIs, ETFs, BDRs, cripto, exterior).
-- Idempotente. Rode no Supabase: SQL Editor > New query > cole tudo > Run.
--
-- Investimentos antigos (renda fixa, valor digitado à mão) continuam iguais:
-- as colunas novas ficam vazias para eles.

-- =====================================================
-- 1) POSIÇÃO NA BOLSA (colunas novas em investments)
-- =====================================================

alter table public.investments add column if not exists ticker text;
alter table public.investments add column if not exists asset_class text;
alter table public.investments add column if not exists quantity numeric(24, 8);
alter table public.investments add column if not exists avg_price numeric(20, 8);
alter table public.investments add column if not exists currency text;
alter table public.investments add column if not exists last_price numeric(20, 8);
alter table public.investments add column if not exists last_change_pct numeric(12, 4);
alter table public.investments add column if not exists last_price_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'investments_asset_class_check'
       and conrelid = 'public.investments'::regclass
  ) then
    alter table public.investments
      add constraint investments_asset_class_check
      check (asset_class is null or asset_class in ('acao', 'fii', 'etf', 'bdr', 'cripto', 'exterior'));
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'investments_quantity_check'
       and conrelid = 'public.investments'::regclass
  ) then
    alter table public.investments
      add constraint investments_quantity_check
      check (quantity is null or quantity >= 0);
  end if;
end;
$$;

create index if not exists investments_user_ticker_idx
  on public.investments (user_id, scope, ticker)
  where ticker is not null;

-- =====================================================
-- 2) OPERAÇÕES (compras e vendas)
-- =====================================================

create table if not exists public.investment_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric(24, 8) not null check (quantity > 0),
  -- Preço unitário na moeda do ativo (BRL na B3, USD no exterior).
  price numeric(20, 8) not null check (price >= 0),
  -- Dólar usado na conversão (1 para ativos em real).
  fx_rate numeric(14, 6) not null default 1 check (fx_rate > 0),
  -- Taxas e corretagem, em reais.
  fees numeric(14, 2) not null default 0 check (fees >= 0),
  -- Lucro ou prejuízo realizado na venda, em reais (null nas compras).
  realized_profit numeric(14, 2),
  traded_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists investment_trades_investment_idx
  on public.investment_trades (investment_id, traded_at desc);
create index if not exists investment_trades_user_idx
  on public.investment_trades (user_id);

alter table public.investment_trades enable row level security;

drop policy if exists "investment_trades_select" on public.investment_trades;
create policy "investment_trades_select"
on public.investment_trades
for select
using (auth.uid() = user_id);

-- Inserir só pela função abaixo (que confere o dono e atualiza a posição junto).
-- Apagar uma operação solta deixaria a posição errada: some junto com o investimento.
drop policy if exists "investment_trades_delete" on public.investment_trades;
revoke insert, update, delete on public.investment_trades from anon, authenticated;

-- =====================================================
-- 3) FUNÇÃO ATÔMICA DE COMPRA / VENDA
-- =====================================================
-- Compra: soma quantidade, recalcula preço médio e custo (em reais).
-- Venda: tira quantidade, baixa o custo proporcional e grava o lucro realizado.
-- security definer porque o usuário não insere direto em investment_trades;
-- por isso a função só mexe em linhas com user_id = auth.uid().

create or replace function public.ff_investment_trade(
  p_investment_id uuid,
  p_side text,
  p_quantity numeric,
  p_price numeric,
  p_fx_rate numeric default 1,
  p_fees numeric default 0,
  p_traded_at date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_inv public.investments%rowtype;
  v_qty numeric;
  v_avg numeric;
  v_cost numeric;
  v_fx numeric := coalesce(nullif(p_fx_rate, 0), 1);
  v_fees numeric := coalesce(p_fees, 0);
  v_new_qty numeric;
  v_new_avg numeric;
  v_new_cost numeric;
  v_cost_out numeric;
  v_realized numeric := null;
  v_price_now numeric;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_side not in ('buy', 'sell') then
    raise exception 'invalid_side' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'invalid_quantity' using errcode = '22023';
  end if;
  if p_price is null or p_price < 0 or v_fees < 0 or v_fx <= 0 then
    raise exception 'invalid_price' using errcode = '22023';
  end if;

  select * into v_inv
    from public.investments
   where id = p_investment_id and user_id = v_user
   for update;

  if not found then
    raise exception 'investment_not_found' using errcode = 'P0002';
  end if;
  if v_inv.ticker is null then
    raise exception 'not_market_investment' using errcode = '22023';
  end if;

  v_qty := coalesce(v_inv.quantity, 0);
  v_avg := coalesce(v_inv.avg_price, 0);
  v_cost := coalesce(v_inv.invested_amount, 0);

  if p_side = 'buy' then
    v_new_qty := v_qty + p_quantity;
    -- Preço médio na moeda do ativo, com as taxas embutidas.
    v_new_avg := ((v_qty * v_avg) + (p_quantity * p_price) + (v_fees / v_fx)) / v_new_qty;
    v_new_cost := v_cost + (p_quantity * p_price * v_fx) + v_fees;
  else
    if p_quantity > v_qty + 0.00000001 then
      raise exception 'insufficient_quantity' using errcode = '22023';
    end if;
    v_new_qty := greatest(v_qty - p_quantity, 0);
    v_cost_out := case when v_qty > 0 then v_cost * (p_quantity / v_qty) else 0 end;
    v_realized := round((p_quantity * p_price * v_fx) - v_fees - v_cost_out, 2);
    v_new_cost := greatest(v_cost - v_cost_out, 0);
    v_new_avg := case when v_new_qty > 0 then v_avg else 0 end;
  end if;

  -- Valor atual: usa a última cotação salva; sem cotação, usa o preço da operação.
  v_price_now := coalesce(v_inv.last_price, p_price);

  update public.investments
     set quantity = round(v_new_qty, 8),
         avg_price = round(v_new_avg, 8),
         invested_amount = round(v_new_cost, 2),
         current_value = round(v_new_qty * v_price_now * v_fx, 2),
         updated_at = now()
   where id = v_inv.id;

  insert into public.investment_trades
    (user_id, investment_id, side, quantity, price, fx_rate, fees, realized_profit, traded_at)
  values
    (v_user, v_inv.id, p_side, p_quantity, p_price, v_fx, v_fees, v_realized,
     coalesce(p_traded_at, current_date));

  return jsonb_build_object(
    'quantity', round(v_new_qty, 8),
    'avg_price', round(v_new_avg, 8),
    'invested_amount', round(v_new_cost, 2),
    'realized_profit', v_realized
  );
end;
$$;

revoke all on function public.ff_investment_trade(uuid, text, numeric, numeric, numeric, numeric, date) from public, anon;
grant execute on function public.ff_investment_trade(uuid, text, numeric, numeric, numeric, numeric, date) to authenticated;
