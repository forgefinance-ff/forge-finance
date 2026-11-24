// Dados do Relatório completo (a página de impressão / PDF).
// Os cálculos puros ficam em lib/full-report-core.ts.
import type { ReportPeriod } from "@/app/(dashboard)/relatorios/data/period";
import { getBusinessPanel, type BusinessPanel } from "@/lib/business-panel";
import { shiftDate, todayInBrazil } from "@/lib/dates";
import {
  buildInsights,
  buildMonthlySeries,
  monthStartBack,
  percentChange,
  periodTitle,
  previousRange,
  savingsRate,
  topWithOthers,
  weekdaySpend,
  type SeriesPoint,
  type Slice,
  type WeekdayStat,
} from "@/lib/full-report-core";
import { getGoals, type Goal } from "@/lib/goals";
import { getBusinessRevenue, getDasPayments, getMeiSettings } from "@/lib/mei";
import { calcLimit, type DasPayment, type LimitCalc, type MeiSettings } from "@/lib/mei-shared";
import { getPayables } from "@/lib/payables";
import type { Payable } from "@/lib/payables-shared";
import { firstRelation } from "@/lib/relations";
import type { Scope } from "@/lib/scope";
import { getActiveScope } from "@/lib/scope-server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import {
  getCategoryTotals,
  getDailyTotals,
  getMonthlyTotals,
  getTotals,
  type Totals,
} from "@/lib/totals";

export type ReportAccount = { name: string; balance: number };
export type ReportInvestment = { name: string; invested: number; current: number };
export type ReportTopExpense = { title: string; category: string; date: string; amount: number };

export type BusinessSection = {
  panel: BusinessPanel;
  mei: { settings: MeiSettings | null; limit: LimitCalc; das: DasPayment[] };
  toPay: { items: Payable[]; total: number };
  toReceive: { items: Payable[]; total: number };
};

export type FullReport = {
  scope: Scope;
  userName: string;
  /** Data de hoje no fuso de Brasília (AAAA-MM-DD). */
  today: string;
  period: {
    key: ReportPeriod["key"];
    from: string | null;
    to: string;
    title: string;
    previousTitle: string | null;
  };
  totals: Totals;
  previous: Totals | null;
  savingsRate: number | null;
  changes: { income: number | null; expense: number | null };
  insights: string[];
  /** Últimos 12 meses (sempre), para dar contexto ao período. */
  series: SeriesPoint[];
  expenseSlices: Slice[];
  incomeSlices: Slice[];
  weekdays: WeekdayStat[];
  /** Aviso quando o dia da semana usa uma janela diferente do período. */
  weekdayNote: string | null;
  topExpenses: ReportTopExpense[];
  accounts: ReportAccount[];
  accountsTotal: number;
  investments: ReportInvestment[];
  investmentsTotal: number;
  netWorth: number;
  goals: Goal[];
  /** Só no escopo Empresa. */
  business: BusinessSection | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getFullReport(period: ReportPeriod): Promise<FullReport | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const scope = await getActiveScope();
  const today = todayInBrazil();
  const from = period.from;
  const to = period.to ?? today;

  const previousPeriod = from ? previousRange(from, to) : null;
  // Sem data inicial ("Tudo"), o dia da semana usa os últimos 12 meses.
  const dailyFrom = from ?? shiftDate(to, -364);

  let topQuery = supabase
    .from("transactions")
    .select("title, description, amount, transaction_date, categories(name)")
    .eq("user_id", user.id)
    .eq("scope", scope)
    .eq("type", "expense")
    .eq("kind", "regular")
    .lte("transaction_date", to);
  if (from) topQuery = topQuery.gte("transaction_date", from);

  const [
    totals,
    previous,
    expenseCategories,
    incomeCategories,
    monthly,
    daily,
    accountsRes,
    investmentsRes,
    topRes,
    profileRes,
    goals,
  ] = await Promise.all([
    getTotals(supabase, scope, from, to),
    previousPeriod
      ? getTotals(supabase, scope, previousPeriod.from, previousPeriod.to)
      : Promise.resolve(null),
    getCategoryTotals(supabase, scope, "expense", from, to),
    getCategoryTotals(supabase, scope, "income", from, to),
    getMonthlyTotals(supabase, scope, monthStartBack(to, 11), to),
    getDailyTotals(supabase, scope, dailyFrom, to),
    supabase
      .from("accounts_today")
      .select("name, current_balance:balance_today")
      .eq("user_id", user.id)
      .eq("scope", scope)
      .order("created_at", { ascending: true }),
    supabase
      .from("investments")
      .select("name, invested_amount, current_value")
      .eq("user_id", user.id)
      .eq("scope", scope),
    topQuery.order("amount", { ascending: false }).limit(10),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    getGoals(),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (investmentsRes.error) throw investmentsRes.error;
  if (topRes.error) throw topRes.error;

  // Categorias com o mesmo nome aparecem juntas.
  const sumByName = (rows: { name: string; total: number }[]) => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.name, (map.get(r.name) ?? 0) + r.total);
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  };
  const expenseSlices = topWithOthers(sumByName(expenseCategories));
  const incomeSlices = topWithOthers(sumByName(incomeCategories));

  const weekdays = weekdaySpend(daily.map((d) => ({ day: d.day, expense: d.expense })));
  const busiestWeekday = [...weekdays].sort((a, b) => b.total - a.total)[0];

  const accounts: ReportAccount[] = (accountsRes.data ?? []).map((a) => ({
    name: String(a.name),
    balance: Number(a.current_balance ?? 0),
  }));
  const accountsTotal = round2(accounts.reduce((s, a) => s + a.balance, 0));

  const investments: ReportInvestment[] = (investmentsRes.data ?? []).map((i) => ({
    name: String(i.name),
    invested: Number(i.invested_amount ?? 0),
    current: Number(i.current_value ?? 0),
  }));
  const investmentsTotal = round2(investments.reduce((s, i) => s + i.current, 0));

  const topExpenses: ReportTopExpense[] = (topRes.data ?? []).map((t) => ({
    title: String(t.title ?? t.description ?? "Sem descrição"),
    category: (firstRelation(t.categories) as { name: string } | null)?.name ?? "Sem categoria",
    date: String(t.transaction_date).slice(0, 10),
    amount: Number(t.amount),
  }));

  const insights = buildInsights({
    income: totals.income,
    expense: totals.expense,
    result: totals.result,
    previous: previous ? { income: previous.income, expense: previous.expense } : null,
    topExpense:
      expenseSlices[0] && expenseSlices[0].name !== "Outras"
        ? { name: expenseSlices[0].name, share: expenseSlices[0].share }
        : null,
    topWeekday:
      busiestWeekday && busiestWeekday.total > 0
        ? { label: busiestWeekday.label, share: busiestWeekday.share }
        : null,
  });

  let business: BusinessSection | null = null;
  if (scope === "business") {
    const year = Number(today.slice(0, 4));
    const [panel, settings, revenue, das, toPay, toReceive] = await Promise.all([
      getBusinessPanel(),
      getMeiSettings(),
      getBusinessRevenue(year),
      getDasPayments(year),
      // Atrasadas + o que vence nos próximos 30 dias.
      getPayables({ kind: "payable", status: "pendentes", to: shiftDate(today, 30) }),
      getPayables({ kind: "receivable", status: "pendentes", to: shiftDate(today, 30) }),
    ]);

    if (panel) {
      business = {
        panel,
        mei: { settings, limit: calcLimit(settings, revenue, today), das },
        toPay: { items: toPay, total: round2(toPay.reduce((s, p) => s + p.amount, 0)) },
        toReceive: {
          items: toReceive,
          total: round2(toReceive.reduce((s, p) => s + p.amount, 0)),
        },
      };
    }
  }

  const fullName = (profileRes.data as { full_name?: string | null } | null)?.full_name;

  return {
    scope,
    userName:
      fullName ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email?.split("@")[0] ||
      "Usuário",
    today,
    period: {
      key: period.key,
      from,
      to,
      title: periodTitle(from, to),
      previousTitle: previousPeriod ? periodTitle(previousPeriod.from, previousPeriod.to) : null,
    },
    totals,
    previous,
    savingsRate: savingsRate(totals.income, totals.expense),
    changes: {
      income: previous ? percentChange(totals.income, previous.income) : null,
      expense: previous ? percentChange(totals.expense, previous.expense) : null,
    },
    insights,
    series: buildMonthlySeries(
      monthly.map((m) => ({ day: m.day, income: m.income, expense: m.expense })),
      12
    ),
    expenseSlices,
    incomeSlices,
    weekdays,
    weekdayNote: from ? null : "Calculado sobre os últimos 12 meses.",
    topExpenses,
    accounts,
    accountsTotal,
    investments,
    investmentsTotal,
    netWorth: round2(accountsTotal + investmentsTotal),
    goals,
    business,
  };
}
