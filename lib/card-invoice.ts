// Faturas do cartão de crédito (cálculo puro, sem banco).
//
// Regra: a compra feita ANTES do dia de fechamento entra na fatura que fecha
// naquele mês; no dia do fechamento ou depois, entra na do mês seguinte.
// O vencimento é no mesmo mês do fechamento se o dia de vencimento for maior
// que o de fechamento; senão, no mês seguinte.

export type CardRef = { id: string; name: string; closing_day: number; due_day: number; limit_amount: number };

export type CardMovement = {
  id: string;
  date: string; // AAAA-MM-DD
  amount: number;
  /** purchase = compra; refund = estorno no cartão; payment = pagamento da fatura */
  kind: "purchase" | "refund" | "payment";
  description: string;
  category?: string | null;
};

export type InvoiceStatus = "aberta" | "fechada" | "paga" | "vencida" | "futura";

export type Invoice = {
  key: string; // AAAA-MM da data de vencimento
  closingDate: string;
  dueDate: string;
  total: number; // compras − estornos
  paid: number;
  pending: number;
  status: InvoiceStatus;
  items: CardMovement[];
};

const pad = (n: number) => String(n).padStart(2, "0");

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function dateOf(year: number, month: number, day: number) {
  // month 1-12, com virada de ano e dia limitado ao fim do mês.
  const y = year + Math.floor((month - 1) / 12);
  const m = ((month - 1) % 12 + 12) % 12 + 1;
  return `${y}-${pad(m)}-${pad(Math.min(day, daysInMonth(y, m)))}`;
}

/** Fechamento e vencimento da fatura em que cai uma compra feita em `date`. */
export function invoiceFor(date: string, closingDay: number, dueDay: number) {
  const [y, m, d] = date.split("-").map(Number);
  const closesThisMonth = d < Math.min(closingDay, daysInMonth(y, m));
  const closeMonth = closesThisMonth ? m : m + 1;
  const closingDate = dateOf(y, closeMonth, closingDay);
  const dueMonth = dueDay > closingDay ? closeMonth : closeMonth + 1;
  const dueDate = dateOf(y, dueMonth, dueDay);
  return { closingDate, dueDate, key: dueDate.slice(0, 7) };
}

/** Agrupa as compras por fatura e distribui os pagamentos (mais antiga primeiro). */
export function buildInvoices(card: CardRef, movements: CardMovement[], today: string): Invoice[] {
  const byKey = new Map<string, Invoice>();

  for (const mv of movements) {
    if (mv.kind === "payment") continue;
    const ref = invoiceFor(mv.date, card.closing_day, card.due_day);
    const inv =
      byKey.get(ref.key) ??
      ({
        key: ref.key,
        closingDate: ref.closingDate,
        dueDate: ref.dueDate,
        total: 0,
        paid: 0,
        pending: 0,
        status: "aberta",
        items: [],
      } as Invoice);
    inv.total += mv.kind === "purchase" ? mv.amount : -mv.amount;
    inv.items.push(mv);
    byKey.set(ref.key, inv);
  }

  const invoices = [...byKey.values()].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  let payments = movements
    .filter((mv) => mv.kind === "payment")
    .reduce((sum, mv) => sum + mv.amount, 0);

  let openAssigned = false;
  for (const inv of invoices) {
    inv.total = round(inv.total);
    const use = Math.min(Math.max(inv.total, 0), payments);
    inv.paid = round(use);
    payments = round(payments - use);
    inv.pending = round(Math.max(inv.total - inv.paid, 0));
    inv.items.sort((a, b) => b.date.localeCompare(a.date));

    if (inv.pending <= 0.004) inv.status = "paga";
    else if (today >= inv.closingDate) inv.status = today > inv.dueDate ? "vencida" : "fechada";
    else {
      // Só a primeira fatura ainda não fechada é a "aberta"; as outras são parcelas futuras.
      inv.status = openAssigned ? "futura" : "aberta";
      openAssigned = true;
    }
  }

  // Pagamento a mais vira crédito na próxima fatura em aberto.
  if (payments > 0) {
    const next = invoices.find((inv) => inv.pending > 0);
    if (next) {
      const use = Math.min(next.pending, payments);
      next.paid = round(next.paid + use);
      next.pending = round(next.pending - use);
      if (next.pending <= 0.004) next.status = "paga";
    }
  }

  return invoices;
}

export function cardSummary(card: CardRef, invoices: Invoice[], today: string) {
  const used = round(invoices.reduce((sum, inv) => sum + inv.pending, 0));
  const current =
    invoices.find((inv) => inv.status === "aberta") ??
    invoices.find((inv) => today < inv.closingDate) ??
    null;
  const toPay = invoices.filter((inv) => inv.status === "fechada" || inv.status === "vencida");
  return {
    used,
    available: round(Math.max(card.limit_amount - used, 0)),
    usage: card.limit_amount > 0 ? Math.min(used / card.limit_amount, 1) : 0,
    current,
    toPay,
    overdue: toPay.filter((inv) => inv.status === "vencida"),
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
