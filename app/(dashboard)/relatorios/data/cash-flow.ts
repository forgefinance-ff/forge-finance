import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { shiftDate, spanDays, type ReportPeriod } from "./period";

export type CashFlowItem = {
  month: string;
  receitas: number;
  despesas: number;
};

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1]}/${year.slice(2)}`;
}

function dayLabel(key: string) {
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

export async function getCashFlowData(
  period: ReportPeriod
): Promise<CashFlowItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope());

  if (period.from) query = query.gte("transaction_date", period.from);
  if (period.to) query = query.lt("transaction_date", shiftDate(period.to, 1));

  const { data: transactions, error } = await query.order("transaction_date", {
    ascending: true,
  });

  if (error) {
    throw error;
  }

  // Períodos curtos (até 31 dias) são agrupados por dia; os demais, por mês.
  const days = spanDays(period);
  const byDay = days !== null && days <= 31;

  const buckets = new Map<string, CashFlowItem>();

  if (byDay && period.from) {
    for (let i = 0; i < (days as number); i++) {
      const key = shiftDate(period.from, i);
      buckets.set(key, { month: dayLabel(key), receitas: 0, despesas: 0 });
    }
  }

  for (const transaction of transactions ?? []) {
    const dateKey = String(transaction.transaction_date).slice(0, 10);
    const key = byDay ? dateKey : dateKey.slice(0, 7);

    if (!buckets.has(key)) {
      buckets.set(key, {
        month: byDay ? dayLabel(key) : monthLabel(key),
        receitas: 0,
        despesas: 0,
      });
    }

    const item = buckets.get(key)!;

    if (transaction.type === "income") {
      item.receitas += Number(transaction.amount);
    } else {
      item.despesas += Number(transaction.amount);
    }
  }

  return [...buckets.values()];
}
