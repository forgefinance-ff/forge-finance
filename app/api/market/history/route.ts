import { NextResponse } from "next/server";

import { getAssetHistory, getMarketHistory, isMarketSymbolKey } from "@/lib/market/quotes";
import { isAssetClass, isHistoryRange, normalizeTicker } from "@/lib/market/symbols";
import { allowRequest } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Candles e volume para os gráficos.
 * Ativo: ?ticker=PETR4&class=acao&range=1d
 * Mercado: ?market=ibov|dolar|btc|sp500&range=1d
 */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const range = params.get("range") ?? "1mo";
  if (!isHistoryRange(range)) return NextResponse.json({ error: "Período inválido." }, { status: 400 });

  if (!(await allowRequest(user.id, "market_history", 60, 60))) {
    return NextResponse.json({ error: "Muitas consultas seguidas. Aguarde um pouco." }, { status: 429 });
  }

  const market = params.get("market");
  let history;
  if (market) {
    if (!isMarketSymbolKey(market)) return NextResponse.json({ error: "Índice inválido." }, { status: 400 });
    history = await getMarketHistory(market, range);
  } else {
    const assetClass = params.get("class");
    if (!isAssetClass(assetClass)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    const ticker = normalizeTicker(params.get("ticker") ?? "", assetClass);
    if (!ticker) return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    history = await getAssetHistory({ ticker, assetClass }, range);
  }

  if (!history) return NextResponse.json({ error: "Gráfico indisponível agora." }, { status: 502 });

  return NextResponse.json(
    { range, ...history, fetchedAt: Date.now() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
