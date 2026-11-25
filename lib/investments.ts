import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import {
  buildPortfolio,
  quoteKey,
  type InvestmentRow,
  type PortfolioSummary,
  type Quote,
} from "@/lib/market/portfolio";
import { getAssetQuotes, getIndices } from "@/lib/market/quotes";
import { isAssetClass, type AssetClass } from "@/lib/market/symbols";

export type Investment = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  invested_amount: number;
  current_value: number;
  institution: string;
  created_at: string;
  updated_at: string;
  ticker?: string | null;
  asset_class?: string | null;
  quantity?: number | null;
  avg_price?: number | null;
  currency?: string | null;
  last_price?: number | null;
  last_change_pct?: number | null;
  last_price_at?: string | null;
};

export type InvestmentTrade = {
  id: string;
  investment_id: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fx_rate: number;
  fees: number;
  realized_profit: number | null;
  traded_at: string;
};

export async function getInvestments() {
  const supabase = await createClient();

  const user = await getAuthUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Investment[];
}

/** Operações (compras e vendas) do usuário no escopo ativo. Vazio se a tabela ainda não existir. */
export async function getInvestmentTrades(investmentIds: string[]): Promise<InvestmentTrade[]> {
  if (!investmentIds.length) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investment_trades")
    .select("id, investment_id, side, quantity, price, fx_rate, fees, realized_profit, traded_at")
    .in("investment_id", investmentIds)
    .order("traded_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? []).map((t) => ({
    ...t,
    quantity: Number(t.quantity),
    price: Number(t.price),
    fx_rate: Number(t.fx_rate),
    fees: Number(t.fees),
    realized_profit: t.realized_profit == null ? null : Number(t.realized_profit),
  })) as InvestmentTrade[];
}

export type MarketIndexView = {
  price: number | null;
  changePct: number | null;
  marketOpen: boolean;
};

export type PortfolioView = PortfolioSummary & {
  ibovespa: MarketIndexView | null;
  dolar: MarketIndexView | null;
  trades: InvestmentTrade[];
  fetchedAt: number;
  /** false quando nenhum provedor respondeu (mostra os últimos valores salvos). */
  live: boolean;
};

const SNAPSHOT_MIN_MS = 60_000;

/**
 * Carteira completa com cotações ao vivo. Também salva a última cotação no
 * banco (current_value), para o dashboard, os relatórios e o WhatsApp
 * enxergarem o mesmo valor.
 */
export async function getPortfolio(): Promise<PortfolioView> {
  const investments = await getInvestments();

  const refs = investments
    .filter((i) => i.ticker && isAssetClass(i.asset_class))
    .map((i) => ({ ticker: String(i.ticker), assetClass: i.asset_class as AssetClass }));

  const [quotes, indices, trades] = await Promise.all([
    refs.length ? getAssetQuotes(refs) : Promise.resolve(new Map<string, Quote>()),
    getIndices(),
    getInvestmentTrades(investments.filter((i) => i.ticker).map((i) => i.id)),
  ]);

  const usdBrl = indices.dolar?.price ?? null;
  const realizedProfit = trades.reduce((s, t) => s + (t.realized_profit ?? 0), 0);

  const summary = buildPortfolio(investments as InvestmentRow[], quotes, {
    usdBrl,
    ibovespa: indices.ibovespa
      ? { price: indices.ibovespa.price, changePct: indices.ibovespa.changePct }
      : null,
    realizedProfit,
  });

  await saveSnapshots(investments, quotes, summary);

  const view = (q: Quote | null): MarketIndexView | null =>
    q ? { price: q.price, changePct: q.changePct, marketOpen: q.marketOpen } : null;

  return {
    ...summary,
    ibovespa: view(indices.ibovespa),
    dolar: view(indices.dolar),
    trades,
    fetchedAt: Date.now(),
    live: refs.length === 0 ? !!indices.ibovespa : quotes.size > 0,
  };
}

async function saveSnapshots(
  investments: Investment[],
  quotes: Map<string, Quote>,
  summary: PortfolioSummary
) {
  const now = Date.now();
  const byId = new Map(summary.positions.map((p) => [p.id, p]));
  const updates = investments.filter((i) => {
    if (!i.ticker || !isAssetClass(i.asset_class)) return false;
    if (!quotes.has(quoteKey(String(i.ticker), i.asset_class))) return false;
    const last = i.last_price_at ? Date.parse(i.last_price_at) : 0;
    return now - last >= SNAPSHOT_MIN_MS;
  });
  if (!updates.length) return;

  const supabase = await createClient();
  await Promise.all(
    updates.map(async (i) => {
      const q = quotes.get(quoteKey(String(i.ticker), i.asset_class as AssetClass))!;
      const p = byId.get(i.id);
      if (!p) return;
      const { error } = await supabase
        .from("investments")
        .update({
          current_value: p.value,
          last_price: q.price,
          last_change_pct: q.changePct,
          last_price_at: new Date(now).toISOString(),
        })
        .eq("id", i.id)
        .eq("user_id", i.user_id);
      if (error) console.error("investment snapshot failed", error.code);
    })
  );
}
