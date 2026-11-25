// Regras do resumo do mês (puras, sem banco: dá para testar isoladas).

export type SummaryTx = {
  type: string;
  amount: number | string;
  scope: string;
  title: string;
  transaction_date: string;
  created_at: string;
  category_id: string | null;
  categories: { name: string } | { name: string }[] | null;
};

export type SummaryBudget = { category_id: string; monthly_limit: number | string };

export type MonthlySummary = {
  month: string; // YYYY-MM
  monthName: string; // "novembro"
  income: number;
  expense: number;
  saved: number;
  savedRate: number | null; // % do que entrou
  prevExpense: number;
  expenseChange: number | null; // % vs mês anterior
  topCategories: { name: string; amount: number; share: number }[];
  biggest: { title: string; amount: number } | null;
  entries: number;
  /** Dias do mês com pelo menos uma movimentação. */
  activeDays: number;
  daysInMonth: number;
  budgets: { total: number; kept: number };
  business: { revenue: number; costs: number; profit: number } | null;
  empty: boolean;
};

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function monthName(ym: string): string {
  return MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;
}

/** Último dia do mês (28, 29, 30 ou 31). */
export function lastDayOfMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isLastDayOfMonth(date: string): boolean {
  return Number(date.slice(8, 10)) === lastDayOfMonth(date.slice(0, 7));
}

export function shiftMonthYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/**
 * Qual resumo mostrar como "novo" hoje: no último dia, o do próprio mês;
 * nos 3 primeiros dias do mês seguinte, o do mês que acabou (para quem não
 * abriu o app no último dia). Fora disso, nenhum.
 */
export function freshSummaryMonth(today: string): string | null {
  if (isLastDayOfMonth(today)) return today.slice(0, 7);
  if (Number(today.slice(8, 10)) <= 3) return shiftMonthYm(today.slice(0, 7), -1);
  return null;
}

/** Mês mostrado em /resumo sem parâmetro: o atual no último dia, senão o anterior. */
export function defaultSummaryMonth(today: string): string {
  return isLastDayOfMonth(today) ? today.slice(0, 7) : shiftMonthYm(today.slice(0, 7), -1);
}

function catName(t: SummaryTx): string {
  const c = Array.isArray(t.categories) ? t.categories[0] : t.categories;
  return c?.name ?? "Sem categoria";
}

export function buildMonthlySummary(
  ym: string,
  txs: SummaryTx[],
  prevPersonalExpense: number,
  budgets: SummaryBudget[]
): MonthlySummary {
  let income = 0;
  let expense = 0;
  let bizIn = 0;
  let bizOut = 0;
  let hasBusiness = false;
  const byCat = new Map<string, number>();
  const byCatId = new Map<string, number>();
  const days = new Set<string>();
  let biggest: { title: string; amount: number } | null = null;

  for (const t of txs) {
    const value = Number(t.amount) || 0;
    if (t.transaction_date.slice(0, 7) === ym) days.add(t.transaction_date.slice(0, 10));

    if (t.scope === "business") {
      hasBusiness = true;
      if (t.type === "income") bizIn += value;
      else if (t.type === "expense") bizOut += value;
      continue;
    }

    if (t.type === "income") income += value;
    else if (t.type === "expense") {
      expense += value;
      byCat.set(catName(t), (byCat.get(catName(t)) ?? 0) + value);
      if (t.category_id) byCatId.set(t.category_id, (byCatId.get(t.category_id) ?? 0) + value);
      if (!biggest || value > biggest.amount) biggest = { title: t.title, amount: value };
    }
  }

  const topCategories = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount, share: expense ? amount / expense : 0 }));

  const kept = budgets.filter((b) => (byCatId.get(b.category_id) ?? 0) <= Number(b.monthly_limit)).length;
  const saved = income - expense;
  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    month: ym,
    monthName: monthName(ym),
    income: round(income),
    expense: round(expense),
    saved: round(saved),
    savedRate: income > 0 ? Math.round((saved / income) * 100) : null,
    prevExpense: round(prevPersonalExpense),
    expenseChange: prevPersonalExpense > 0 ? Math.round(((expense - prevPersonalExpense) / prevPersonalExpense) * 100) : null,
    topCategories,
    biggest,
    entries: txs.length,
    activeDays: days.size,
    daysInMonth: lastDayOfMonth(ym),
    budgets: { total: budgets.length, kept },
    business: hasBusiness ? { revenue: round(bizIn), costs: round(bizOut), profit: round(bizIn - bizOut) } : null,
    empty: txs.length === 0,
  };
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Texto do WhatsApp. `short` vai no template aprovado da Meta. */
/** Link do relatório completo (PDF) de um mês fechado. `appUrl` sem barra no fim. */
export function fullReportLink(appUrl: string, ym: string): string {
  const last = String(lastDayOfMonth(ym)).padStart(2, "0");
  return `${appUrl}/relatorio-completo?period=custom&from=${ym}-01&to=${ym}-${last}`;
}

export function summaryWhatsAppText(s: MonthlySummary, link: string, trialDaysLeft: number | null, reportLink?: string) {
  const lines = [
    `🗓️ Seu ${s.monthName} no Forge Finance:`,
    "",
    `🟢 Entrou ${brl(s.income)}`,
    `🔴 Saiu ${brl(s.expense)}`,
    s.saved >= 0 ? `💰 Sobrou ${brl(s.saved)}${s.savedRate !== null ? ` (${s.savedRate}% do que entrou)` : ""}` : `⚠️ Faltou ${brl(-s.saved)}`,
    s.topCategories[0] ? `🏷️ Onde mais gastou: ${s.topCategories[0].name} (${brl(s.topCategories[0].amount)})` : null,
    s.business ? `🏢 Empresa: lucro de ${brl(s.business.profit)}` : null,
    `📝 ${s.entries} lançamento(s) em ${s.activeDays} dia(s)`,
    "",
    `Veja o resumo completo: ${link}`,
    reportLink ? `📄 Relatório completo para baixar em PDF: ${reportLink}` : null,
    trialDaysLeft !== null ? `\n⏳ Seu teste grátis termina em ${trialDaysLeft} dia(s).` : null,
  ].filter((l) => l !== null);
  const short = `entrou ${brl(s.income)}, saiu ${brl(s.expense)}, ${s.saved >= 0 ? `sobrou ${brl(s.saved)}` : `faltou ${brl(-s.saved)}`}`;
  return { text: lines.join("\n"), short };
}

export type HistoryPoint = { month: string; label: string; income: number; expense: number };

/** Entradas e saídas pessoais dos `n` meses até `ym` (inclusive), para o gráfico. */
export function buildHistory(
  rows: { type: string; amount: number | string; transaction_date: string }[],
  ym: string,
  n = 6
): HistoryPoint[] {
  const months = Array.from({ length: n }, (_, i) => shiftMonthYm(ym, i - (n - 1)));
  const map = new Map(months.map((m) => [m, { income: 0, expense: 0 }]));
  for (const r of rows) {
    const bucket = map.get(r.transaction_date.slice(0, 7));
    if (!bucket) continue;
    const v = Number(r.amount) || 0;
    if (r.type === "income") bucket.income += v;
    else if (r.type === "expense") bucket.expense += v;
  }
  return months.map((m) => ({
    month: m,
    label: monthName(m).slice(0, 3),
    income: Math.round(map.get(m)!.income * 100) / 100,
    expense: Math.round(map.get(m)!.expense * 100) / 100,
  }));
}
