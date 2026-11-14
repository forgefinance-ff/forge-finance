/** Contas de orçamento (puras, sem banco: dá para testar). */
export type BudgetStatus = "ok" | "attention" | "over";

export function budgetMath(limit: number, spent: number, today: string) {
  const [y, m, d] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const perDay = d > 0 ? spent / d : 0;
  const projected = Math.round(perDay * daysInMonth * 100) / 100;
  const remaining = Math.round((limit - spent) * 100) / 100;

  let overrunDay: number | null = null;
  if (spent > limit) overrunDay = d;
  else if (perDay > 0) {
    const day = Math.ceil(limit / perDay);
    if (day <= daysInMonth) overrunDay = Math.max(day, d);
  }

  const status: BudgetStatus = spent > limit ? "over" : overrunDay !== null || spent >= limit * 0.8 ? "attention" : "ok";
  return { projected, remaining, overrunDay, status };
}

