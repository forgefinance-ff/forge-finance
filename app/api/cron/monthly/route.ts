import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/cron-auth";
import { sendMonthlySummaries } from "@/lib/monthly-whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron da Vercel (todo dia, 19h de Brasília): envia o resumo só no último dia do mês. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json(await sendMonthlySummaries());
  } catch (error) {
    console.error("cron monthly", error);
    return NextResponse.json({ error: "Falha ao enviar o resumo do mês." }, { status: 500 });
  }
}
