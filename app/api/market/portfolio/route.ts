import { NextResponse } from "next/server";

import { getPortfolio } from "@/lib/investments";
import { allowRequest } from "@/lib/rate-limit";
import { getAuthUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Carteira com cotações ao vivo (a tela chama a cada 30 s com o pregão aberto). */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });

  if (!(await allowRequest(user.id, "market_portfolio", 20, 60))) {
    return NextResponse.json({ error: "Muitas atualizações seguidas. Aguarde um pouco." }, { status: 429 });
  }

  try {
    const portfolio = await getPortfolio();
    return NextResponse.json(portfolio, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("market portfolio failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Não foi possível atualizar agora." }, { status: 502 });
  }
}
