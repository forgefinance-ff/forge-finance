import { createClient } from "@/lib/supabase/server";
import { firstRelation } from "@/lib/relations";
import { shiftDate, type ReportPeriod } from "./period";

export type CategoryExpense = {
  name: string;
  value: number;
};

export async function getCategoryExpenses(
  period: ReportPeriod
): Promise<CategoryExpense[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("transactions")
    .select(`
      amount,
      type,
      categories(name)
    `)
    .eq("user_id", user.id)
    .eq("type", "expense");

  if (period.from) query = query.gte("transaction_date", period.from);
  if (period.to) query = query.lt("transaction_date", shiftDate(period.to, 1));

  const { data, error } = await query;

  if (error) throw error;

  const totals = new Map<string, number>();

  for (const item of data ?? []) {
    const name =
      firstRelation(
        item.categories as unknown as
          | { name?: string }
          | { name?: string }[]
          | null
      )?.name ?? "Sem categoria";

    totals.set(name, (totals.get(name) ?? 0) + Number(item.amount));
  }

  return [...totals.entries()].map(([name, value]) => ({
    name,
    value,
  }));
}
