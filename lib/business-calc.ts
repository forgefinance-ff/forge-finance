// Cálculos da gestão da Empresa (sem acesso ao banco: fáceis de testar).

export type CostClass = "variable" | "fixed" | "tax" | "prolabore";

export type BizTransaction = {
  amount: number;
  type: "income" | "expense";
  kind: string; // regular | contribution | loan | refund
  date: string; // AAAA-MM-DD
  costClass: CostClass | null;
  category: string;
};

export type BizPayable = {
  id: string;
  kind: "payable" | "receivable";
  description: string;
  amount: number;
  dueDate: string;
  recurrence: "none" | "monthly";
  customerId: string | null;
  customerName: string | null;
};

export type DreMonth = {
  month: string; // AAAA-MM
  label: string;
  revenue: number;
  taxes: number;
  variable: number;
  contributionMargin: number;
  contributionMarginPct: number | null;
  fixed: number;
  prolabore: number;
  unclassified: number;
  profit: number;
  profitPct: number | null;
  salesCount: number;
  averageTicket: number | null;
  /** Retiradas de lucro e aportes que saíram da Empresa (não entram no lucro). */
  ownerWithdrawals: number;
  ownerContributions: number;
  loansIn: number;
  loansOut: number;
};

const round = (n: number) => Math.round(n * 100) / 100;

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]}/${String(y).slice(2)}`;
}

function emptyMonth(month: string): DreMonth {
  return {
    month,
    label: monthLabel(month),
    revenue: 0,
    taxes: 0,
    variable: 0,
    contributionMargin: 0,
    contributionMarginPct: null,
    fixed: 0,
    prolabore: 0,
    unclassified: 0,
    profit: 0,
    profitPct: null,
    salesCount: 0,
    averageTicket: null,
    ownerWithdrawals: 0,
    ownerContributions: 0,
    loansIn: 0,
    loansOut: 0,
  };
}

/** DRE simplificada por mês, do mais antigo ao mais recente. */
export function buildDre(transactions: BizTransaction[], months: string[]): DreMonth[] {
  const map = new Map(months.map((m) => [m, emptyMonth(m)]));

  for (const t of transactions) {
    const row = map.get(monthKey(t.date));
    if (!row) continue;
    const v = Number(t.amount);

    if (t.kind === "regular") {
      if (t.type === "income") {
        row.revenue += v;
        row.salesCount += 1;
      } else if (t.costClass === "tax") row.taxes += v;
      else if (t.costClass === "variable") row.variable += v;
      else if (t.costClass === "fixed") row.fixed += v;
      else if (t.costClass === "prolabore") row.prolabore += v;
      else row.unclassified += v;
    } else if (t.kind === "contribution") {
      if (t.type === "expense") row.ownerWithdrawals += v;
      else row.ownerContributions += v;
    } else if (t.kind === "loan") {
      if (t.type === "income") row.loansIn += v;
      else row.loansOut += v;
    }
  }

  return months.map((m) => {
    const row = map.get(m)!;
    row.contributionMargin = row.revenue - row.taxes - row.variable;
    row.profit = row.contributionMargin - row.fixed - row.prolabore - row.unclassified;
    row.contributionMarginPct = row.revenue > 0 ? (row.contributionMargin / row.revenue) * 100 : null;
    row.profitPct = row.revenue > 0 ? (row.profit / row.revenue) * 100 : null;
    row.averageTicket = row.salesCount > 0 ? row.revenue / row.salesCount : null;

    for (const key of Object.keys(row) as (keyof DreMonth)[]) {
      const value = row[key];
      if (typeof value === "number" && key !== "salesCount") {
        (row as unknown as Record<string, number>)[key] = round(value);
      }
    }
    return row;
  });
}

export type Breakeven = {
  /** Custos que não mudam com as vendas (fixos + pró-labore + não classificados), média mensal. */
  fixedCosts: number;
  /** Quanto de cada R$ 1 vendido vai para impostos e custos variáveis (0 a 1). */
  variableRate: number;
  /** Faturamento mensal necessário para lucro zero. null se não dá para calcular. */
  revenueNeeded: number | null;
  basedOnMonths: number;
};

/** Ponto de equilíbrio pela média dos meses informados (com faturamento). */
export function buildBreakeven(dre: DreMonth[]): Breakeven {
  const used = dre.filter((m) => m.revenue > 0);
  if (used.length === 0) {
    const costs = dre.reduce((s, m) => s + m.fixed + m.prolabore + m.unclassified, 0);
    return {
      fixedCosts: dre.length ? round(costs / dre.length) : 0,
      variableRate: 0,
      revenueNeeded: null,
      basedOnMonths: 0,
    };
  }

  const revenue = used.reduce((s, m) => s + m.revenue, 0);
  const variable = used.reduce((s, m) => s + m.taxes + m.variable, 0);
  const fixed = used.reduce((s, m) => s + m.fixed + m.prolabore + m.unclassified, 0);
  const fixedCosts = fixed / used.length;
  const variableRate = revenue > 0 ? variable / revenue : 0;

  return {
    fixedCosts: round(fixedCosts),
    variableRate: Math.round(variableRate * 10000) / 10000,
    revenueNeeded: variableRate < 1 ? round(fixedCosts / (1 - variableRate)) : null,
    basedOnMonths: used.length,
  };
}

/** Preço sugerido: custo ÷ (1 − % variáveis − % margem desejada). */
export function suggestedPrice(unitCost: number, variablePct: number, marginPct: number) {
  const rest = 1 - variablePct / 100 - marginPct / 100;
  if (!(unitCost > 0) || rest <= 0) return null;
  return round(unitCost / rest);
}

/* ------------------------- fluxo de caixa projetado ------------------------- */

export type CashEvent = {
  date: string;
  description: string;
  amount: number; // + entra, − sai
  kind: "payable" | "receivable";
  overdue: boolean;
  projected: boolean; // recorrência ainda não gerada
};

export type CashPoint = { date: string; label: string; balance: number };

export type CashProjection = {
  startBalance: number;
  points: CashPoint[];
  events: CashEvent[];
  lowest: { date: string; balance: number };
  firstNegative: string | null;
  inflow: number;
  outflow: number;
};

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthKeepDay(date: string, months: number, day: number) {
  const [y, m] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

/**
 * Saldo de hoje + contas a receber − contas a pagar, dia a dia.
 * Atrasadas entram hoje (precisam ser resolvidas). Contas mensais ainda não
 * geradas são projetadas nos meses seguintes.
 */
export function buildCashProjection(
  startBalance: number,
  payables: BizPayable[],
  today: string,
  days = 90
): CashProjection {
  const end = addDays(today, days);
  const events: CashEvent[] = [];

  for (const p of payables) {
    const sign = p.kind === "receivable" ? 1 : -1;
    const overdue = p.dueDate < today;
    const first = overdue ? today : p.dueDate;

    if (first <= end) {
      events.push({
        date: first,
        description: p.description,
        amount: sign * p.amount,
        kind: p.kind,
        overdue,
        projected: false,
      });
    }

    if (p.recurrence === "monthly") {
      const day = Number(p.dueDate.slice(8, 10));
      for (let i = 1; i <= 4; i++) {
        const next = addMonthKeepDay(p.dueDate, i, day);
        if (next <= today) continue;
        if (next > end) break;
        events.push({
          date: next,
          description: p.description,
          amount: sign * p.amount,
          kind: p.kind,
          overdue: false,
          projected: true,
        });
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date) || a.amount - b.amount);

  const byDay = new Map<string, number>();
  for (const e of events) byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.amount);

  const points: CashPoint[] = [];
  let balance = startBalance;
  let lowest = { date: today, balance: startBalance };
  let firstNegative: string | null = startBalance < 0 ? today : null;

  for (let i = 0; i <= days; i++) {
    const date = addDays(today, i);
    balance += byDay.get(date) ?? 0;
    balance = round(balance);
    if (balance < lowest.balance) lowest = { date, balance };
    if (balance < 0 && !firstNegative) firstNegative = date;
    points.push({ date, label: `${date.slice(8, 10)}/${date.slice(5, 7)}`, balance });
  }

  return {
    startBalance: round(startBalance),
    points,
    events,
    lowest,
    firstNegative,
    inflow: round(events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0)),
    outflow: round(events.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0)),
  };
}

/* ------------------------------ inadimplência ------------------------------ */

export type ReceivableRow = {
  customerId: string | null;
  customerName: string | null;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "canceled";
  paidAt: string | null;
};

export type CustomerStat = {
  customerId: string;
  name: string;
  received12m: number;
  overdue: number;
  overdueCount: number;
  maxDaysLate: number;
  paidLateCount: number;
  paidCount: number;
};

function daysBetween(from: string, to: string) {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000
  );
}

export function buildDelinquency(rows: ReceivableRow[], today: string) {
  const since = addDays(today, -365);
  const map = new Map<string, CustomerStat>();
  let overdueTotal = 0;
  let overdueCount = 0;
  let lateDaysSum = 0;

  for (const r of rows) {
    if (r.status === "canceled") continue;
    const key = r.customerId ?? "none";
    const stat =
      map.get(key) ??
      {
        customerId: key,
        name: r.customerName ?? "Sem cliente",
        received12m: 0,
        overdue: 0,
        overdueCount: 0,
        maxDaysLate: 0,
        paidLateCount: 0,
        paidCount: 0,
      };

    if (r.status === "pending" && r.dueDate < today) {
      const late = daysBetween(r.dueDate, today);
      stat.overdue += r.amount;
      stat.overdueCount += 1;
      stat.maxDaysLate = Math.max(stat.maxDaysLate, late);
      overdueTotal += r.amount;
      overdueCount += 1;
      lateDaysSum += late;
    }

    if (r.status === "paid" && r.paidAt) {
      if (r.paidAt >= since) stat.received12m += r.amount;
      stat.paidCount += 1;
      if (r.paidAt > r.dueDate) stat.paidLateCount += 1;
    }

    map.set(key, stat);
  }

  const customers = [...map.values()].map((c) => ({
    ...c,
    received12m: round(c.received12m),
    overdue: round(c.overdue),
  }));

  return {
    overdueTotal: round(overdueTotal),
    overdueCount,
    overdueCustomers: customers.filter((c) => c.overdue > 0).length,
    averageDaysLate: overdueCount ? Math.round(lateDaysSum / overdueCount) : 0,
    topCustomers: [...customers]
      .filter((c) => c.received12m > 0)
      .sort((a, b) => b.received12m - a.received12m)
      .slice(0, 5),
    worstPayers: [...customers]
      .filter((c) => c.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5),
  };
}
