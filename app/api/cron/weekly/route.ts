import { NextResponse } from "next/server";

import { sendWeeklySummaries } from "@/lib/weekly-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron da Vercel (domingo, 19h de Brasília): resumo semanal no WhatsApp. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json(await sendWeeklySummaries());
  } catch (error) {
    console.error("cron weekly", error);
    return NextResponse.json({ error: "Falha ao enviar o resumo semanal." }, { status: 500 });
  }
}
