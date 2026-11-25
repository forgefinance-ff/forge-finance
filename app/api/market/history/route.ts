import { NextResponse } from "next/server";

import { getAssetHistory } from "@/lib/market/quotes";
import { isAssetClass, isHistoryRange, normalizeTicker } from "@/lib/market/symbols";
import { allowRequest } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pontos do gráfico de um ativo: ?ticker=PETR4&class=acao&range=1mo */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const assetClass = params.get("class");
  const range = params.get("range") ?? "1mo";
  if (!isAssetClass(assetClass) || !isHistoryRange(range)) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }
  const ticker = normalizeTicker(params.get("ticker") ?? "", assetClass);
  if (!ticker) return NextResponse.json({ error: "Código inválido." }, { status: 400 });

  if (!(await allowRequest(user.id, "market_history", 40, 60))) {
    return NextResponse.json({ error: "Muitas consultas seguidas. Aguarde um pouco." }, { status: 429 });
  }

  const points = await getAssetHistory({ ticker, assetClass }, range);
  if (!points) return NextResponse.json({ error: "Histórico indisponível agora." }, { status: 502 });

  return NextResponse.json({ ticker, range, points }, { headers: { "Cache-Control": "private, max-age=30" } });
}
