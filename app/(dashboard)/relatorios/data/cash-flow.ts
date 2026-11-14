import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { getDailyTotals, getMonthlyTotals } from "@/lib/totals";
import { shiftDate, spanDays, type ReportPeriod } from "./period";

export type CashFlowItem = {
  month: string;
  receitas: number;
  despesas: number;
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1]}/${year.slice(2)}`;
}

function dayLabel(key: string) {
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

export async function getCashFlowData(period: ReportPeriod): Promise<CashFlowItem[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const scope = await getActiveScope();

  // Períodos curtos (até 31 dias) são agrupados por dia; os demais, por mês.
  const days = spanDays(period);
  const byDay = days !== null && days <= 31 && !!period.from && !!period.to;

  if (byDay) {
    const rows = await getDailyTotals(supabase, scope, period.from!, period.to!);
    const map = new Map(rows.map((r) => [r.day, r]));
    return Array.from({ length: days as number }, (_, i) => {
      const key = shiftDate(period.from!, i);
      const row = map.get(key);
      return { month: dayLabel(key), receitas: row?.income ?? 0, despesas: row?.expense ?? 0 };
    });
  }

  const rows = await getMonthlyTotals(supabase, scope, period.from, period.to);
  return rows.map((r) => ({ month: monthLabel(r.day.slice(0, 7)), receitas: r.income, despesas: r.expense }));
}
