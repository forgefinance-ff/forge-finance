import { cache } from "react";

import { todayInBrazil } from "@/lib/dates";
import { getActiveScope } from "@/lib/scope-server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getCategoryTotals } from "@/lib/totals";

import { budgetMath, type BudgetStatus } from "@/lib/budget-math";

export type { BudgetStatus };

export type Budget = {
  id: string;
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  limit: number;
  /** Gasto no mês até hoje. */
  spent: number;
  remaining: number;
  /** Quanto deve gastar até o fim do mês no ritmo atual. */
  projected: number;
  /** Dia do mês em que, no ritmo atual, estoura (null = não estoura). */
  overrunDay: number | null;
  status: BudgetStatus;
};


/** Orçamentos do escopo ativo com o gasto do mês (somado no banco). */
export const getBudgets = cache(async (): Promise<Budget[]> => {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const scope = await getActiveScope();
  const today = todayInBrazil();
  const monthStart = `${today.slice(0, 7)}-01`;

  const [{ data, error }, totals] = await Promise.all([
    supabase
      .from("budgets")
      .select("id, category_id, monthly_limit, categories!inner(name, icon, color, scope)")
      .eq("user_id", user.id)
      .eq("categories.scope", scope),
    getCategoryTotals(supabase, scope, "expense", monthStart, today),
  ]);

  // Sem a migração aplicada, a tela continua funcionando (sem orçamentos).
  if (error) return [];

  const spentBy = new Map(totals.map((t) => [t.categoryId, t.total]));

  return (data ?? [])
    .map((row) => {
      const category = (Array.isArray(row.categories) ? row.categories[0] : row.categories) as {
        name: string;
        icon: string | null;
        color: string | null;
      };
      const limit = Number(row.monthly_limit);
      const spent = spentBy.get(row.category_id) ?? 0;
      return {
        id: row.id,
        categoryId: row.category_id,
        name: category?.name ?? "Categoria",
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        limit,
        spent,
        ...budgetMath(limit, spent, today),
      };
    })
    .sort((a, b) => b.spent / b.limit - a.spent / a.limit);
});
