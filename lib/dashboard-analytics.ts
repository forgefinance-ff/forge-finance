/**
 * Análises derivadas das transações reais do usuário.
 * Nenhum dado é inventado: tudo é calculado a partir do que veio do banco.
 * Datas de transação (coluna `date`) são tratadas como strings YYYY-MM-DD
 * para evitar deslocamentos de fuso horário.
 */

export type AnalyticsTransaction = {
  amount: number;
  type: string;
  description: string | null;
  transactionDate: string; // YYYY-MM-DD
  categoryName: string | null;
  categoryColor: string | null;
};

export type CategorySlice = {
  name: string;
  color: string;
  value: number;
};

export type HeatmapCell = {
  date: string; // YYYY-MM-DD
  count: number;
  total: number;
};

export type CategoryAnomaly = {
  name: string;
  current: number;
  average: number;
};

export type DuplicateGroup = {
  description: string;
  amount: number;
  date: string;
  count: number;
};

export type DashboardAnalytics = {
  monthKey: string;
  monthIncome: number;
  monthExpense: number;
  previousMonthExpense: number;
  expenseByCategory: CategorySlice[];
  anomalies: CategoryAnomaly[];
  duplicates: DuplicateGroup[];
  heatmap: HeatmapCell[]; // ordenado por data, semanas completas (domingo → sábado)
  heatmapWeeks: number;
};

const FALLBACK_COLORS = ["#7c3aed", "#a855f7", "#c084fc", "#4f46e5", "#818cf8", "#e879f9"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function shiftMonth(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export const HEATMAP_WEEKS = 16;

export function buildAnalytics(
  transactions: AnalyticsTransaction[],
  now: Date = new Date()
): DashboardAnalytics {
  const monthKey = monthKeyOf(now);
  const previousKey = monthKeyOf(shiftMonth(now, -1));
  const baselineKeys = [1, 2, 3].map((d) => monthKeyOf(shiftMonth(now, -d)));

  let monthIncome = 0;
  let monthExpense = 0;
  let previousMonthExpense = 0;

  const currentByCategory = new Map<string, { value: number; color: string }>();
  const baselineByCategory = new Map<string, number>();

  const dayMap = new Map<string, { count: number; total: number }>();
  const dupMap = new Map<string, DuplicateGroup>();

  for (const t of transactions) {
    const key = t.transactionDate.slice(0, 7);
    const amount = Number(t.amount);
    const isExpense = t.type === "expense";
    const isIncome = t.type === "income";

    if (key === monthKey) {
      if (isIncome) monthIncome += amount;
      if (isExpense) {
        monthExpense += amount;
        const name = t.categoryName ?? "Sem categoria";
        const current = currentByCategory.get(name);
        currentByCategory.set(name, {
          value: (current?.value ?? 0) + amount,
          color: current?.color ?? t.categoryColor ?? "",
        });
      }
    }

    if (isExpense && key === previousKey) previousMonthExpense += amount;

    if (isExpense && baselineKeys.includes(key)) {
      const name = t.categoryName ?? "Sem categoria";
      baselineByCategory.set(name, (baselineByCategory.get(name) ?? 0) + amount);
    }

    const day = dayMap.get(t.transactionDate) ?? { count: 0, total: 0 };
    day.count += 1;
    day.total += amount;
    dayMap.set(t.transactionDate, day);

    if (isExpense || isIncome) {
      const dupKey = [
        t.transactionDate,
        t.type,
        amount.toFixed(2),
        (t.description ?? "").trim().toLowerCase(),
      ].join("|");
      const group = dupMap.get(dupKey);
      if (group) {
        group.count += 1;
      } else {
        dupMap.set(dupKey, {
          description: t.description?.trim() || "Sem descrição",
          amount,
          date: t.transactionDate,
          count: 1,
        });
      }
    }
  }

  const expenseByCategory: CategorySlice[] = Array.from(currentByCategory.entries())
    .map(([name, v], index) => ({
      name,
      value: v.value,
      color: v.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  // Gasto fora do padrão: categoria do mês acima de 1,5x a média dos 3 meses anteriores
  // (só com histórico real e diferença mínima de R$ 50 para evitar ruído).
  const anomalies: CategoryAnomaly[] = [];
  for (const slice of expenseByCategory) {
    const baselineTotal = baselineByCategory.get(slice.name);
    if (!baselineTotal) continue;
    const average = baselineTotal / 3;
    if (slice.value >= average * 1.5 && slice.value - average >= 50) {
      anomalies.push({ name: slice.name, current: slice.value, average });
    }
  }
  anomalies.sort((a, b) => b.current - b.average - (a.current - a.average));

  const duplicates = Array.from(dupMap.values())
    .filter((g) => g.count > 1)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);

  // Heatmap: HEATMAP_WEEKS semanas completas terminando na semana atual.
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(end);
  endOfWeek.setDate(end.getDate() + (6 - end.getDay()));
  const start = new Date(endOfWeek);
  start.setDate(endOfWeek.getDate() - (HEATMAP_WEEKS * 7 - 1));

  const heatmap: HeatmapCell[] = [];
  for (let i = 0; i < HEATMAP_WEEKS * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toKey(d);
    const info = dayMap.get(key);
    heatmap.push({ date: key, count: info?.count ?? 0, total: info?.total ?? 0 });
  }

  return {
    monthKey,
    monthIncome,
    monthExpense,
    previousMonthExpense,
    expenseByCategory,
    anomalies: anomalies.slice(0, 3),
    duplicates,
    heatmap,
    heatmapWeeks: HEATMAP_WEEKS,
  };
}
