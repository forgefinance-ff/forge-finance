// Resumo semanal enviado pelo WhatsApp (domingo à noite) para quem ativou
// em Configurações > Avisos.
import { shiftDate, todayInBrazil } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/totals";
import { sendTemplate, sendText } from "@/lib/whatsapp/meta";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Tx = { type: string; amount: number | string; categories: { name: string } | { name: string }[] | null };

export function buildWeekly(txs: Tx[], dueCount: number, dueTotal: number) {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const t of txs) {
    const value = Number(t.amount);
    if (t.type === "income") income += value;
    else {
      expense += value;
      const name = (Array.isArray(t.categories) ? t.categories[0] : t.categories)?.name ?? "Sem categoria";
      byCategory.set(name, (byCategory.get(name) ?? 0) + value);
    }
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

  const lines = [
    "📅 Sua semana no Forge Finance:",
    "",
    `🟢 Entrou ${brl(income)}`,
    `🔴 Saiu ${brl(expense)}`,
    top ? `🏷️ Onde mais gastou: ${top[0]} (${brl(top[1])})` : null,
    dueCount ? `\n🔜 Na próxima semana vencem ${dueCount} conta(s): ${brl(dueTotal)}.` : "\n✅ Nada vencendo na próxima semana.",
    "",
    "Quer detalhes? Pergunte aqui, ex.: \"quanto gastei com mercado?\".",
  ].filter((l) => l !== null);

  const short = `entrou ${brl(income)}, saiu ${brl(expense)}${dueCount ? `, ${dueCount} conta(s) vencendo` : ""}`;
  return { text: lines.join("\n"), short, empty: txs.length === 0 && dueCount === 0 };
}

export async function sendWeeklySummaries() {
  const db = createAdminClient();
  const today = todayInBrazil();
  const weekAgo = shiftDate(today, -6);
  const nextWeek = shiftDate(today, 7);
  const template = process.env.WHATSAPP_WEEKLY_TEMPLATE;
  const language = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG || "pt_BR";

  const { data: prefs, error } = await db.from("notification_prefs").select("user_id").eq("weekly_summary", true);
  if (error) throw error;
  const userIds = (prefs ?? []).map((p) => p.user_id);
  if (!userIds.length) return { sent: 0, skipped: 0, failed: 0 };

  const { data: links } = await db.from("whatsapp_links").select("user_id, phone").in("user_id", userIds);

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const link of links ?? []) {
    try {
      const txs = await fetchAllRows<Tx>((a, b) =>
        db
          .from("transactions")
          .select("type, amount, categories(name)")
          .eq("user_id", link.user_id)
          .eq("kind", "regular")
          .gte("transaction_date", weekAgo)
          .lte("transaction_date", today)
          .order("id")
          .range(a, b)
      );
      const { data: due } = await db
        .from("payables")
        .select("amount")
        .eq("user_id", link.user_id)
        .eq("status", "pending")
        .eq("kind", "payable")
        .gt("due_date", today)
        .lte("due_date", nextWeek)
        .limit(200);

      const dueTotal = (due ?? []).reduce((s, r) => s + Number(r.amount), 0);
      const summary = buildWeekly(txs, due?.length ?? 0, dueTotal);
      if (summary.empty) {
        skipped++;
        continue;
      }

      const ok = template
        ? await sendTemplate(link.phone, template, [summary.short], language)
        : await sendText(link.phone, summary.text);
      if (ok) sent++;
      else failed++;
    } catch (error) {
      console.error("weekly summary failed", error);
      failed++;
    }
  }

  return { sent, skipped, failed, mode: template ? "template" : "text" };
}
