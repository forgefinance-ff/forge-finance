import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAllRows } from "@/lib/totals";

import {
  buildHistory,
  buildMonthlySummary,
  type HistoryPoint,
  lastDayOfMonth,
  shiftMonthYm,
  type MonthlySummary,
  type SummaryBudget,
  type SummaryTx,
} from "./monthly-summary-core";

export * from "./monthly-summary-core";

/**
 * Resumo de um mês para um usuário. Funciona com o cliente do usuário (RLS)
 * ou com a service role (cron), sempre filtrando por user_id.
 */
export async function loadMonthlySummary(db: SupabaseClient, userId: string, ym: string): Promise<MonthlySummary> {
  const from = `${ym}-01`;
  const to = `${ym}-${String(lastDayOfMonth(ym)).padStart(2, "0")}`;
  const prev = shiftMonthYm(ym, -1);
  const prevFrom = `${prev}-01`;
  const prevTo = `${prev}-${String(lastDayOfMonth(prev)).padStart(2, "0")}`;

  const [txs, prevTxs, budgetsRes] = await Promise.all([
    fetchAllRows<SummaryTx>((a, b) =>
      db
        .from("transactions")
        .select("type, amount, scope, title, transaction_date, created_at, category_id, categories(name)")
        .eq("user_id", userId)
        .eq("kind", "regular")
        .gte("transaction_date", from)
        .lte("transaction_date", to)
        .order("id")
        .range(a, b)
    ),
    fetchAllRows<{ amount: number | string }>((a, b) =>
      db
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("kind", "regular")
        .eq("type", "expense")
        .eq("scope", "personal")
        .gte("transaction_date", prevFrom)
        .lte("transaction_date", prevTo)
        .order("id")
        .range(a, b)
    ),
    db.from("budgets").select("category_id, monthly_limit").eq("user_id", userId),
  ]);

  const prevExpense = prevTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  return buildMonthlySummary(ym, txs, prevExpense, (budgetsRes.data ?? []) as SummaryBudget[]);
}

/** Entradas e saídas pessoais dos últimos 6 meses (para o gráfico do resumo). */
export async function loadSummaryHistory(db: SupabaseClient, userId: string, ym: string): Promise<HistoryPoint[]> {
  const first = `${shiftMonthYm(ym, -5)}-01`;
  const last = `${ym}-${String(lastDayOfMonth(ym)).padStart(2, "0")}`;
  const rows = await fetchAllRows<{ type: string; amount: number | string; transaction_date: string }>((a, b) =>
    db
      .from("transactions")
      .select("type, amount, transaction_date")
      .eq("user_id", userId)
      .eq("kind", "regular")
      .eq("scope", "personal")
      .gte("transaction_date", first)
      .lte("transaction_date", last)
      .order("id")
      .range(a, b)
  );
  return buildHistory(rows, ym);
}
