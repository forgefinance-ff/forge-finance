import { NextResponse } from "next/server";

import type { Quote } from "@/lib/market/portfolio";
import { getAssetQuotes, getMarketQuote, MARKET_SYMBOLS, type MarketSymbolKey } from "@/lib/market/quotes";
import { ASSET_CLASS_SHORT, type AssetClass } from "@/lib/market/symbols";
import { allowRequest } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ações mais negociadas da B3 + cripto para a faixa de cotações. */
const TAPE_ASSETS: { ticker: string; assetClass: AssetClass }[] = [
  { ticker: "PETR4", assetClass: "acao" },
  { ticker: "VALE3", assetClass: "acao" },
  { ticker: "ITUB4", assetClass: "acao" },
  { ticker: "BBDC4", assetClass: "acao" },
  { ticker: "BBAS3", assetClass: "acao" },
  { ticker: "WEGE3", assetClass: "acao" },
  { ticker: "ABEV3", assetClass: "acao" },
  { ticker: "B3SA3", assetClass: "acao" },
  { ticker: "MGLU3", assetClass: "acao" },
  { ticker: "BOVA11", assetClass: "etf" },
  { ticker: "ETH", assetClass: "cripto" },
];

export type TapeItem = {
  key: string;
  label: string;
  kind: string;
  price: number;
  changePct: number | null;
  currency: string;
  spark: number[] | null;
  marketOpen: boolean;
};

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });

  if (!(await allowRequest(user.id, "market_overview", 20, 60))) {
    return NextResponse.json({ error: "Muitas atualizações seguidas." }, { status: 429 });
  }

  const marketKeys = Object.keys(MARKET_SYMBOLS) as MarketSymbolKey[];
  const [markets, assets] = await Promise.all([
    Promise.all(marketKeys.map(async (k) => [k, await getMarketQuote(k)] as const)),
    getAssetQuotes(TAPE_ASSETS),
  ]);

  const item = (key: string, label: string, kind: string, q: Quote | null | undefined, currency?: string): TapeItem | null =>
    q
      ? {
          key,
          label,
          kind,
          price: q.price,
          changePct: q.changePct,
          currency: currency ?? q.currency,
          spark: q.spark ?? null,
          marketOpen: q.marketOpen,
        }
      : null;

  const items = [
    ...markets.map(([k, q]) => item(k, MARKET_SYMBOLS[k].label, "Índice", q, MARKET_SYMBOLS[k].currency)),
    ...TAPE_ASSETS.map((a) =>
      item(`${a.assetClass}:${a.ticker}`, a.ticker, ASSET_CLASS_SHORT[a.assetClass], assets.get(`${a.assetClass}:${a.ticker}`))
    ),
  ].filter((x): x is TapeItem => !!x);

  return NextResponse.json({ items, fetchedAt: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
