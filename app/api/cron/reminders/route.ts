import { NextResponse } from "next/server";

import { sendDailyReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Chamado pelo Cron da Vercel (vercel.json) uma vez por dia.
 * A Vercel envia "Authorization: Bearer <CRON_SECRET>" quando a variável
 * CRON_SECRET está definida no projeto.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await sendDailyReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("cron reminders", error);
    return NextResponse.json({ error: "Falha ao enviar lembretes." }, { status: 500 });
  }
}
