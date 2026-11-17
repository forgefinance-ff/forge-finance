// Resumo do mês no WhatsApp: roda todo dia (cron), mas só envia no último
// dia do mês (28, 29, 30 ou 31), às 19h de Brasília.
import { billingEnabled } from "@/lib/billing/config";
import { isTrialActive, trialDaysLeft } from "@/lib/billing/manual-access";
import { todayInBrazil } from "@/lib/dates";
import { isLastDayOfMonth, loadMonthlySummary, summaryWhatsAppText } from "@/lib/monthly-summary";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplate, sendText } from "@/lib/whatsapp/meta";

export async function sendMonthlySummaries({ force = false }: { force?: boolean } = {}) {
  const today = todayInBrazil();
  if (!force && !isLastDayOfMonth(today)) return { skipped: "não é o último dia do mês", today };

  const ym = today.slice(0, 7);
  const db = createAdminClient();
  const template = process.env.WHATSAPP_MONTHLY_TEMPLATE;
  const language = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG || "pt_BR";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const link = `${appUrl}/resumo?mes=${ym}`;

  const [{ data: links, error }, { data: optedOut }] = await Promise.all([
    db.from("whatsapp_links").select("user_id, phone"),
    db.from("notification_prefs").select("user_id").eq("monthly_summary", false),
  ]);
  if (error) throw error;
  const off = new Set((optedOut ?? []).map((p) => p.user_id));
  const targets = (links ?? []).filter((l) => !off.has(l.user_id));

  const trials = new Map<string, string | null>();
  if (billingEnabled() && targets.length) {
    const { data: ents } = await db
      .from("user_entitlements")
      .select("user_id, plan_id, access_source, status, trial_ends_at")
      .in("user_id", targets.map((t) => t.user_id));
    for (const e of ents ?? []) {
      const paying = e.access_source !== "beta" && ["active", "past_due"].includes(e.status);
      if (!paying && isTrialActive(e.trial_ends_at)) trials.set(e.user_id, e.trial_ends_at);
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    try {
      const summary = await loadMonthlySummary(db, target.user_id, ym);
      if (summary.empty) {
        skipped++;
        continue;
      }
      const daysLeft = trials.has(target.user_id) ? trialDaysLeft(trials.get(target.user_id)) : null;
      const { text, short } = summaryWhatsAppText(summary, link, daysLeft);
      const ok = template ? await sendTemplate(target.phone, template, [short], language) : await sendText(target.phone, text);
      if (ok) sent++;
      else failed++;
    } catch (err) {
      console.error("monthly summary failed", err);
      failed++;
    }
  }

  return { month: ym, sent, skipped, failed, mode: template ? "template" : "text" };
}
