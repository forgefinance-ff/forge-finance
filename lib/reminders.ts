// Resumo diário de vencimentos enviado pelo WhatsApp a quem vinculou o número.
import { shiftDate, todayInBrazil } from "@/lib/dates";
import { firstRelation } from "@/lib/relations";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplate, sendText } from "@/lib/whatsapp/meta";

type Row = {
  user_id: string;
  scope: "personal" | "business";
  kind: "payable" | "receivable";
  description: string;
  amount: number;
  due_date: string;
  customers: { name: string } | { name: string }[] | null;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

function line(p: Row) {
  const who = firstRelation(p.customers)?.name;
  const tag = p.scope === "business" ? "🏢" : "👤";
  const sign = p.kind === "receivable" ? "receber" : "pagar";
  return `${tag} ${p.description}${who ? ` (${who})` : ""}: ${brl(Number(p.amount))} a ${sign} · ${ddmm(p.due_date)}`;
}

export function buildDigest(rows: Row[], today: string) {
  const tomorrow = shiftDate(today, 1);
  const overdue = rows.filter((r) => r.due_date < today);
  const dueToday = rows.filter((r) => r.due_date === today);
  const dueTomorrow = rows.filter((r) => r.due_date === tomorrow);

  const sum = (list: Row[], kind: Row["kind"]) =>
    list.filter((r) => r.kind === kind).reduce((s, r) => s + Number(r.amount), 0);

  const parts: string[] = ["☀️ Bom dia! Seus vencimentos no Forge Finance:"];
  if (overdue.length) {
    parts.push("", `⚠️ Atrasadas (${overdue.length})`, ...overdue.slice(0, 8).map(line));
    if (overdue.length > 8) parts.push(`…e mais ${overdue.length - 8}.`);
  }
  if (dueToday.length) parts.push("", `📅 Vencem hoje (${dueToday.length})`, ...dueToday.slice(0, 8).map(line));
  if (dueTomorrow.length) {
    parts.push("", `🔜 Vencem amanhã (${dueTomorrow.length})`, ...dueTomorrow.slice(0, 8).map(line));
  }
  parts.push("", "Para marcar como pago ou cobrar um cliente, é só me pedir aqui.");

  const shortSummary = [
    overdue.length
      ? `${overdue.length} atrasada(s): ${brl(sum(overdue, "payable"))} a pagar e ${brl(sum(overdue, "receivable"))} a receber`
      : null,
    dueToday.length + dueTomorrow.length
      ? `${dueToday.length + dueTomorrow.length} vencendo hoje ou amanhã: ${brl(
          sum([...dueToday, ...dueTomorrow], "payable")
        )} a pagar e ${brl(sum([...dueToday, ...dueTomorrow], "receivable"))} a receber`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  return { text: parts.join("\n"), shortSummary, count: overdue.length + dueToday.length + dueTomorrow.length };
}

/** Envia o resumo para cada número vinculado que tenha algo vencendo. */
export async function sendDailyReminders() {
  const db = createAdminClient();
  const today = todayInBrazil();
  const tomorrow = shiftDate(today, 1);
  const template = process.env.WHATSAPP_REMINDER_TEMPLATE;
  const language = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG || "pt_BR";

  const { data: links, error } = await db.from("whatsapp_links").select("user_id, phone");
  if (error) throw error;

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const link of links ?? []) {
    const { data: rows, error: rowsError } = await db
      .from("payables")
      .select("user_id, scope, kind, description, amount, due_date, customers(name)")
      .eq("user_id", link.user_id)
      .eq("status", "pending")
      .lte("due_date", tomorrow)
      .order("due_date", { ascending: true })
      .limit(200);

    if (rowsError) {
      failed++;
      continue;
    }

    const digest = buildDigest((rows ?? []) as Row[], today);
    if (digest.count === 0) {
      skipped++;
      continue;
    }

    // Com modelo aprovado na Meta, chega mesmo sem conversa recente;
    // sem modelo, a mensagem livre só é entregue até 24 h após a última
    // mensagem que o usuário mandou para o bot.
    const ok = template
      ? await sendTemplate(link.phone, template, [digest.shortSummary], language)
      : await sendText(link.phone, digest.text);

    if (ok) sent++;
    else failed++;
  }

  return { sent, skipped, failed, mode: template ? "template" : "text" };
}
