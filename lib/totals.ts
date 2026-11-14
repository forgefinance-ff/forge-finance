/**
 * Totais calculados no banco (funções ff_*). Nunca somar transações no
 * JavaScript: a API devolve no máximo 1.000 linhas por consulta.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Scope } from "@/lib/scope";

export type Totals = {
  /** Receitas de verdade (natureza "regular"). */
  income: number;
  /** Despesas de verdade (inclui compras no cartão). */
  expense: number;
  /** income − expense */
  result: number;
  /** Aportes, empréstimos e reembolsos (líquido). Não entra no resultado. */
  othersNet: number;
  /** Quantidade de lançamentos no intervalo. */
  count: number;
};

type Row = { type: "income" | "expense"; kind: string; total: number | string; n: number | string };

export const EMPTY_TOTALS: Totals = { income: 0, expense: 0, result: 0, othersNet: 0, count: 0 };

export function sumTotals(rows: Row[] | null | undefined): Totals {
  let income = 0;
  let expense = 0;
  let othersNet = 0;
  let count = 0;
  for (const row of rows ?? []) {
    const value = Number(row.total);
    count += Number(row.n);
    if (row.kind === "regular") {
      if (row.type === "income") income += value;
      else expense += value;
    } else if (row.kind !== "card_payment" && row.kind !== "transfer") {
      othersNet += row.type === "income" ? value : -value;
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    income: round(income),
    expense: round(expense),
    result: round(income - expense),
    othersNet: round(othersNet),
    count,
  };
}

/** Totais de um intervalo (datas inclusivas; null = sem limite). */
export async function getTotals(
  db: SupabaseClient,
  scope: Scope,
  from: string | null,
  to: string | null
): Promise<Totals> {
  const { data, error } = await db.rpc("ff_totals", { p_scope: scope, p_from: from, p_to: to });
  if (error) throw error;
  return sumTotals(data as Row[]);
}

export type CategoryTotal = {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
  count: number;
};

export async function getCategoryTotals(
  db: SupabaseClient,
  scope: Scope,
  type: "income" | "expense",
  from: string | null,
  to: string | null
): Promise<CategoryTotal[]> {
  const { data, error } = await db.rpc("ff_category_totals", {
    p_scope: scope,
    p_type: type,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return ((data ?? []) as {
    category_id: string | null;
    name: string;
    icon: string | null;
    color: string | null;
    total: number | string;
    n: number | string;
  }[]).map((r) => ({
    categoryId: r.category_id,
    name: r.name ?? "Sem categoria",
    icon: r.icon,
    color: r.color,
    total: Number(r.total),
    count: Number(r.n),
  }));
}

export type DayTotal = { day: string; income: number; expense: number };

export async function getDailyTotals(db: SupabaseClient, scope: Scope, from: string, to: string): Promise<DayTotal[]> {
  const { data, error } = await db.rpc("ff_daily_totals", { p_scope: scope, p_from: from, p_to: to });
  if (error) throw error;
  return ((data ?? []) as { day: string; income: number | string; expense: number | string }[]).map((r) => ({
    day: String(r.day).slice(0, 10),
    income: Number(r.income),
    expense: Number(r.expense),
  }));
}

export async function getMonthlyTotals(
  db: SupabaseClient,
  scope: Scope,
  from: string | null,
  to: string | null
): Promise<DayTotal[]> {
  const { data, error } = await db.rpc("ff_monthly_totals", { p_scope: scope, p_from: from, p_to: to });
  if (error) throw error;
  return ((data ?? []) as { month: string; income: number | string; expense: number | string }[]).map((r) => ({
    day: String(r.month).slice(0, 10),
    income: Number(r.income),
    expense: Number(r.expense),
  }));
}

/**
 * Busca todas as linhas de uma consulta, de 1.000 em 1.000.
 * Use só quando precisar das linhas em si (listas); para somar, use as
 * funções acima.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  { pageSize = 1000, max = 20000 } = {}
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}
