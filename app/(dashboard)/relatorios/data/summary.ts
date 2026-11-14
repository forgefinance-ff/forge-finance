import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { todayInBrazil } from "@/lib/dates";
import { getTotals } from "@/lib/totals";
import { shiftDate, type ReportPeriod } from "./period";

export type SummaryData = {
  income: number;
  expenses: number;
  balance: number;
  netWorth: number;
  /** Lançamentos com data depois de hoje (parcelas do cartão, agendados). */
  upcomingExpenses: number;
  upcomingIncome: number;
};

export async function getSummaryData(period: ReportPeriod): Promise<SummaryData> {
  const empty = { income: 0, expenses: 0, balance: 0, netWorth: 0, upcomingExpenses: 0, upcomingIncome: 0 };
  const user = await getAuthUser();
  if (!user) return empty;

  const supabase = await createClient();
  const scope = await getActiveScope();
  const today = todayInBrazil();

  const [totals, upcoming, accountsRes, investmentsRes] = await Promise.all([
    getTotals(supabase, scope, period.from, period.to),
    getTotals(supabase, scope, shiftDate(today, 1), null),
    supabase.from("accounts_today").select("balance_today").eq("user_id", user.id).eq("scope", scope),
    supabase.from("investments").select("current_value").eq("user_id", user.id).eq("scope", scope),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (investmentsRes.error) throw investmentsRes.error;

  // Patrimônio é sempre o valor de hoje (contas + investimentos).
  const netWorth =
    (accountsRes.data ?? []).reduce((sum, a) => sum + Number(a.balance_today), 0) +
    (investmentsRes.data ?? []).reduce((sum, i) => sum + Number(i.current_value ?? 0), 0);

  return {
    income: totals.income,
    expenses: totals.expense,
    balance: totals.result,
    netWorth: Math.round(netWorth * 100) / 100,
    upcomingExpenses: upcoming.expense,
    upcomingIncome: upcoming.income,
  };
}
