import { NextResponse } from "next/server";

import { getIndices } from "@/lib/market/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ibovespa e dólar (dado público, sem dados do usuário). Serve também para
 * conferir se o provedor de cotações está respondendo a partir da Vercel.
 */
export async function GET() {
  const { ibovespa, dolar } = await getIndices();
  const view = (q: typeof ibovespa) =>
    q
      ? { price: q.price, changePct: q.changePct, time: q.time, marketOpen: q.marketOpen, source: q.source }
      : null;

  return NextResponse.json(
    { ok: !!(ibovespa || dolar), ibovespa: view(ibovespa), dolar: view(dolar) },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
