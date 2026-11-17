/**
 * Números do topo do dashboard por período (Hoje, Esse mês, 30 dias, Ano).
 * Funções puras: recebem os lançamentos já filtrados (só receita e despesa,
 * até hoje) e a data de hoje em "AAAA-MM-DD" (horário de Brasília).
 */

export type PeriodKey = "today" | "month" | "30d" | "year";

export const PERIODS: { key: PeriodKey; label: string; compare: string }[] = [
  { key: "today", label: "Hoje", compare: "ontem" },
  { key: "month", label: "Esse mês", compare: "o mesmo período do mês passado" },
  { key: "30d", label: "Últimos 30 dias", compare: "os 30 dias anteriores" },
  { key: "year", label: "Esse ano", compare: "" },
];

export type PeriodRow = {
  amount: number;
  type: "income" | "expense";
  transaction_date: string;
};

export type PeriodTotals = {
  income: number;
  expense: number;
  /** Entradas menos saídas. */
  result: number;
  count: number;
};

export type PeriodStats = {
  current: PeriodTotals;
  /** Período anterior equivalente; null quando não há base (ano). */
  previous: PeriodTotals | null;
};

type Range = { from: string; to: string };

function iso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

function addDays(date: string, days: number) {
  const { y, m, d } = parts(date);
  return iso(y, m, d + days);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Intervalos (inclusivos) do período atual e do anterior equivalente. */
export function periodRanges(key: PeriodKey, today: string): { current: Range; previous: Range | null } {
  const { y, m, d } = parts(today);

  switch (key) {
    case "today": {
      const yesterday = addDays(today, -1);
      return { current: { from: today, to: today }, previous: { from: yesterday, to: yesterday } };
    }
    case "month": {
      // Mês passado até o mesmo dia (ou o último dia, se o mês for menor).
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      const lastDay = Math.min(d, daysInMonth(py, pm));
      return {
        current: { from: iso(y, m, 1), to: today },
        previous: { from: iso(py, pm, 1), to: iso(py, pm, lastDay) },
      };
    }
    case "30d":
      return {
        current: { from: addDays(today, -29), to: today },
        previous: { from: addDays(today, -59), to: addDays(today, -30) },
      };
    case "year":
      // Os dados carregados cobrem 13 meses: o ano anterior inteiro não está aqui.
      return { current: { from: iso(y, 1, 1), to: today }, previous: null };
  }
}

export function sumRange(rows: PeriodRow[], range: Range): PeriodTotals {
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const row of rows) {
    const date = row.transaction_date.slice(0, 10);
    if (date < range.from || date > range.to) continue;
    count += 1;
    if (row.type === "income") income += row.amount;
    else expense += row.amount;
  }
  return { income, expense, result: income - expense, count };
}

export function periodStats(rows: PeriodRow[], key: PeriodKey, today: string): PeriodStats {
  const ranges = periodRanges(key, today);
  return {
    current: sumRange(rows, ranges.current),
    previous: ranges.previous ? sumRange(rows, ranges.previous) : null,
  };
}

/**
 * Variação em % (regra de três: anterior está para 100% assim como a
 * diferença está para X). null quando não dá para comparar (anterior zero).
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) * 100) / Math.abs(previous);
}
