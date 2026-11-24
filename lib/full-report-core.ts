// Cálculos do relatório completo (sem acesso ao banco: fáceis de testar).
// Este arquivo não importa nada de propósito, para rodar nos testes sem build.

export type MonthRow = { day: string; income: number; expense: number };

export type SeriesPoint = {
  /** AAAA-MM */
  key: string;
  /** "nov/26" */
  label: string;
  income: number;
  expense: number;
  result: number;
};

export type Slice = { name: string; value: number; share: number };

const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export const WEEKDAY_NAMES = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
];
export const WEEKDAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const round2 = (n: number) => Math.round(n * 100) / 100;

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function dayDiff(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Primeiro dia do mês que fica `back` meses antes do mês de `date`. */
export function monthStartBack(date: string, back: number): string {
  const [y, m] = date.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return d.toISOString().slice(0, 10);
}

/** "2026-11-02" -> "02/11/2026" */
export function dateBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** Título do período: "01/11/2026 a 24/11/2026" ou "Todo o período (até 24/11/2026)". */
export function periodTitle(from: string | null, to: string): string {
  if (!from) return `Todo o período (até ${dateBR(to)})`;
  if (from === to) return dateBR(to);
  return `${dateBR(from)} a ${dateBR(to)}`;
}

/** Período do mesmo tamanho, logo antes de `from`. */
export function previousRange(from: string, to: string): { from: string; to: string } {
  const length = dayDiff(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

/** Variação em %, ou null se não há base de comparação. */
export function percentChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/** Quanto sobrou da receita, em %. null se não houve receita. */
export function savingsRate(income: number, expense: number): number | null {
  if (!(income > 0)) return null;
  return round2(((income - expense) / income) * 100);
}

/** Linhas mensais (dia = primeiro dia do mês) -> pontos do gráfico, em ordem. */
export function buildMonthlySeries(rows: MonthRow[], limit = 12): SeriesPoint[] {
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const key = row.day.slice(0, 7);
    const item = byMonth.get(key) ?? { income: 0, expense: 0 };
    item.income += row.income;
    item.expense += row.expense;
    byMonth.set(key, item);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-limit)
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return {
        key,
        label: `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`,
        income: round2(v.income),
        expense: round2(v.expense),
        result: round2(v.income - v.expense),
      };
    });
}

/** Maiores itens + "Outras" juntando o resto, com a fatia de cada um em %. */
export function topWithOthers(items: { name: string; value: number }[], limit = 7): Slice[] {
  const positive = items
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = positive.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return [];

  const head = positive.slice(0, limit);
  const rest = positive.slice(limit);
  const slices = head.map((i) => ({ name: i.name, value: round2(i.value) }));
  if (rest.length > 0) {
    slices.push({ name: "Outras", value: round2(rest.reduce((s, i) => s + i.value, 0)) });
  }

  return slices.map((s) => ({ ...s, share: round2((s.value / total) * 100) }));
}

export type WeekdayStat = {
  index: number;
  label: string;
  short: string;
  total: number;
  share: number;
};

/** Gasto somado por dia da semana (segunda a domingo). */
export function weekdaySpend(days: { day: string; expense: number }[]): WeekdayStat[] {
  const totals = new Array<number>(7).fill(0);
  for (const d of days) {
    const [y, m, dd] = d.day.slice(0, 10).split("-").map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, dd)).getUTCDay(); // 0 = domingo
    totals[(weekday + 6) % 7] += d.expense;
  }
  const sum = totals.reduce((s, n) => s + n, 0);

  return totals.map((total, index) => ({
    index,
    label: WEEKDAY_NAMES[index],
    short: WEEKDAY_SHORT[index],
    total: round2(total),
    share: sum > 0 ? round2((total / sum) * 100) : 0,
  }));
}

export type InsightInput = {
  income: number;
  expense: number;
  result: number;
  previous: { income: number; expense: number } | null;
  topExpense: { name: string; share: number } | null;
  topWeekday: { label: string; share: number } | null;
};

const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Destaques em frases curtas, só com o que os números mostram. */
export function buildInsights(input: InsightInput): string[] {
  const out: string[] = [];

  if (input.income === 0 && input.expense === 0) {
    return ["Não há lançamentos neste período."];
  }

  const rate = savingsRate(input.income, input.expense);
  if (rate !== null) {
    out.push(
      rate >= 0
        ? `Sobraram ${pct(rate)} da receita no período (${brl(input.result)}).`
        : `As despesas passaram da receita em ${brl(Math.abs(input.result))}.`
    );
  } else if (input.expense > 0) {
    out.push(`Houve ${brl(input.expense)} em despesas e nenhuma receita no período.`);
  }

  if (input.topExpense) {
    out.push(
      `A maior categoria de despesa foi ${input.topExpense.name}, com ${pct(input.topExpense.share)} do total gasto.`
    );
  }

  if (input.topWeekday && input.topWeekday.share > 0) {
    out.push(
      `${input.topWeekday.label} é o dia da semana em que mais se gasta (${pct(input.topWeekday.share)} das despesas).`
    );
  }

  if (input.previous) {
    const exp = percentChange(input.expense, input.previous.expense);
    if (exp !== null) {
      out.push(
        exp === 0
          ? "As despesas ficaram iguais às do período anterior."
          : `As despesas ${exp > 0 ? "subiram" : "caíram"} ${pct(Math.abs(exp))} em relação ao período anterior.`
      );
    }
    const inc = percentChange(input.income, input.previous.income);
    if (inc !== null && inc !== 0) {
      out.push(
        `A receita ${inc > 0 ? "subiu" : "caiu"} ${pct(Math.abs(inc))} em relação ao período anterior.`
      );
    }
  }

  return out;
}
