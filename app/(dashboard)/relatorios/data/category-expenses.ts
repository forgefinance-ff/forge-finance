import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { getCategoryTotals } from "@/lib/totals";
import type { ReportPeriod } from "./period";

export type CategoryExpense = {
  name: string;
  value: number;
  icon: string | null;
};

export async function getCategoryExpenses(period: ReportPeriod): Promise<CategoryExpense[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const rows = await getCategoryTotals(supabase, await getActiveScope(), "expense", period.from, period.to);

  // Categorias com o mesmo nome (ex.: apagada e recriada) aparecem juntas.
  const byName = new Map<string, CategoryExpense>();
  for (const row of rows) {
    const current = byName.get(row.name) ?? { name: row.name, value: 0, icon: row.icon };
    current.value += row.total;
    byName.set(row.name, current);
  }

  return [...byName.values()]
    .map((c) => ({ ...c, value: Math.round(c.value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}
