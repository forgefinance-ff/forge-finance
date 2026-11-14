import type { SupabaseClient } from "@supabase/supabase-js";

import { budgetMath } from "@/lib/budget-math";
import { todayInBrazil } from "@/lib/dates";
import { fetchAllRows } from "@/lib/totals";
import { formatBRL } from "@/lib/whatsapp/text";

/**
 * Depois de um gasto registrado pelo bot: "📊 Delivery: R$ 320 de R$ 400
 * este mês. Faltam R$ 80." Só para categorias com orçamento e se a pessoa
 * não desligou os alertas. Nunca derruba o registro: em erro, não diz nada.
 */
export async function budgetAlertFor(db: SupabaseClient, userId: string, transactionIds: string[]): Promise<string | null> {
  try {
    if (!transactionIds.length) return null;

    const { data: prefs } = await db
      .from("notification_prefs")
      .select("budget_alerts")
      .eq("user_id", userId)
      .maybeSingle();
    if (prefs && prefs.budget_alerts === false) return null;

    const { data: txs } = await db
      .from("transactions")
      .select("category_id, type, kind")
      .eq("user_id", userId)
      .in("id", transactionIds);
    const categoryIds = [
      ...new Set((txs ?? []).filter((t) => t.type === "expense" && t.kind === "regular" && t.category_id).map((t) => t.category_id as string)),
    ];
    if (!categoryIds.length) return null;

    const { data: budgets } = await db
      .from("budgets")
      .select("category_id, monthly_limit, categories(name)")
      .eq("user_id", userId)
      .in("category_id", categoryIds);
    if (!budgets?.length) return null;

    const today = todayInBrazil();
    const monthStart = `${today.slice(0, 7)}-01`;
    const lines: string[] = [];

    for (const b of budgets) {
      const rows = await fetchAllRows((a, z) =>
        db
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("category_id", b.category_id)
          .eq("type", "expense")
          .eq("kind", "regular")
          .gte("transaction_date", monthStart)
          .lte("transaction_date", today)
          .order("id")
          .range(a, z)
      );
      const spent = rows.reduce((s, r) => s + Number(r.amount), 0);
      const limit = Number(b.monthly_limit);
      const name = (Array.isArray(b.categories) ? b.categories[0] : b.categories)?.name ?? "Categoria";
      const m = budgetMath(limit, spent, today);

      if (m.status === "over") {
        lines.push(`🚨 ${name}: ${formatBRL(spent)} de ${formatBRL(limit)} este mês. Passou ${formatBRL(spent - limit)}.`);
      } else if (m.overrunDay !== null) {
        lines.push(`⚠️ ${name}: ${formatBRL(spent)} de ${formatBRL(limit)}. No ritmo atual, estoura por volta do dia ${m.overrunDay}.`);
      } else {
        lines.push(`📊 ${name}: ${formatBRL(spent)} de ${formatBRL(limit)} este mês. Faltam ${formatBRL(m.remaining)}.`);
      }
    }

    return lines.length ? lines.join("\n") : null;
  } catch (error) {
    console.error("budget alert failed", error);
    return null;
  }
}
