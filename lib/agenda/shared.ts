/**
 * Tipos e regras da Agenda usados no servidor e na tela. Sem imports do app
 * (só ./time.ts), para os testes rodarem direto no Node.
 */

import { addDays, addMonths, addYears, daysInMonth, MONTH_LONG, weekday } from "./time.ts";

export type AgendaView = "dia" | "semana" | "mes" | "lista";
export const AGENDA_VIEWS: AgendaView[] = ["dia", "semana", "mes", "lista"];
export const VIEW_LABEL: Record<AgendaView, string> = {
  dia: "Dia",
  semana: "Semana",
  mes: "Mês",
  lista: "Lista",
};

export function parseView(value: unknown): AgendaView | null {
  return AGENDA_VIEWS.includes(value as AgendaView) ? (value as AgendaView) : null;
}

/** Dias que a lista mostra a partir da data escolhida. */
export const LIST_DAYS = 30;

/** Intervalo de datas locais [start, end) que a visão mostra. Semana começa no domingo. */
export function viewRange(view: AgendaView, date: string): { start: string; end: string } {
  switch (view) {
    case "dia":
      return { start: date, end: addDays(date, 1) };
    case "semana": {
      const start = addDays(date, -weekday(date));
      return { start, end: addDays(start, 7) };
    }
    case "mes": {
      const first = `${date.slice(0, 7)}-01`;
      const start = addDays(first, -weekday(first));
      // Sempre 6 semanas: a grade não pula de altura entre meses.
      return { start, end: addDays(start, 42) };
    }
    case "lista":
      return { start: date, end: addDays(date, LIST_DAYS) };
  }
}

/** Data de destino das setas "anterior/próximo". */
export function stepDate(view: AgendaView, date: string, direction: 1 | -1): string {
  switch (view) {
    case "dia":
      return addDays(date, direction);
    case "semana":
      return addDays(date, 7 * direction);
    case "mes":
      return addMonths(`${date.slice(0, 7)}-01`, direction);
    case "lista":
      return addDays(date, LIST_DAYS * direction);
  }
}

export { addYears };

/** Título da barra: "novembro de 2026", "15 – 21 de nov. de 2026"... */
export function rangeTitle(view: AgendaView, date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (view === "mes") return `${MONTH_LONG[m - 1]} de ${y}`;
  if (view === "dia") return `${d} de ${MONTH_LONG[m - 1]} de ${y}`;
  const { start, end } = viewRange(view, date);
  const last = addDays(end, -1);
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ly, lm, ld] = last.split("-").map(Number);
  if (sy === ly && sm === lm) return `${sd} – ${ld} de ${MONTH_LONG[sm - 1]} de ${sy}`;
  if (sy === ly) return `${sd} de ${MONTH_LONG[sm - 1].slice(0, 3)} – ${ld} de ${MONTH_LONG[lm - 1].slice(0, 3)} de ${ly}`;
  return `${sd}/${sm}/${sy} – ${ld}/${lm}/${ly}`;
}

/** Grade do mini calendário: 6 semanas começando no domingo. */
export function monthGrid(month: string): string[] {
  const first = `${month.slice(0, 7)}-01`;
  const start = addDays(first, -weekday(first));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export { daysInMonth };

// ---------- Cores ----------

/** Paleta fixa: funciona no tema claro e no escuro. */
export const AGENDA_COLORS = {
  violeta: "oklch(62% 0.2 292)",
  azul: "oklch(62% 0.16 255)",
  ciano: "oklch(68% 0.12 215)",
  verde: "oklch(64% 0.15 155)",
  ambar: "oklch(74% 0.15 75)",
  laranja: "oklch(66% 0.17 45)",
  rosa: "oklch(64% 0.2 0)",
  cinza: "oklch(60% 0.02 270)",
} as const;

export type AgendaColor = keyof typeof AGENDA_COLORS;

export const COLOR_LABEL: Record<AgendaColor, string> = {
  violeta: "Violeta",
  azul: "Azul",
  ciano: "Ciano",
  verde: "Verde",
  ambar: "Âmbar",
  laranja: "Laranja",
  rosa: "Rosa",
  cinza: "Cinza",
};

export function isAgendaColor(value: unknown): value is AgendaColor {
  return typeof value === "string" && value in AGENDA_COLORS;
}

export function colorValue(color: string | null | undefined): string {
  return isAgendaColor(color) ? AGENDA_COLORS[color] : AGENDA_COLORS.violeta;
}

// ---------- Tipos enviados para a tela ----------

export type AgendaScope = "personal" | "business";

export type AgendaCalendar = {
  id: string;
  scope: AgendaScope;
  kind: "custom" | "financial";
  name: string;
  color: AgendaColor;
  isVisible: boolean;
};

export type AgendaAttendee = { name: string; email: string | null; phone: string | null };

export type AgendaEvent = {
  id: string;
  calendarId: string;
  scope: AgendaScope;
  kind: "event" | "task";
  title: string;
  description: string | null;
  location: string | null;
  meetingUrl: string | null;
  color: AgendaColor | null;
  allDay: boolean;
  /** ISO UTC */
  start: string;
  /** ISO UTC (exclusivo) */
  end: string;
  taskDone: boolean;
  attendees: AgendaAttendee[];
};

export type FinancialStatus = "pending" | "paid" | "overdue";

export type FinancialItem = {
  /** "payable:<id>", "das:<id>", "das-next:<AAAA-MM>", "dasn:<ano>" */
  id: string;
  source: "payable" | "das" | "das-next" | "dasn";
  kind: "pay" | "receive" | "tax";
  scope: AgendaScope;
  title: string;
  /** null quando o valor ainda não é conhecido (DAS sem valor configurado). */
  amount: number | null;
  /** Data local AAAA-MM-DD */
  date: string;
  status: FinancialStatus;
  /** Nome do cliente em cobranças. */
  customer: string | null;
  /** Para "Dar baixa" (contas a pagar/receber). */
  payableId: string | null;
  /** Onde ver/editar no app. */
  href: string;
};

export type DayTotals = { income: number; expense: number; projected: boolean };

/** Total do dia: realizado (lançamentos) até hoje; previsto (pendentes) depois. */
export function buildDayTotals(
  start: string,
  end: string,
  today: string,
  actual: { day: string; income: number; expense: number }[],
  items: FinancialItem[]
): Record<string, DayTotals> {
  const result: Record<string, DayTotals> = {};
  for (let d = start; d < end; d = addDays(d, 1)) {
    result[d] = { income: 0, expense: 0, projected: d > today };
  }
  for (const row of actual) {
    const t = result[row.day];
    if (t && !t.projected) {
      t.income += row.income;
      t.expense += row.expense;
    }
  }
  for (const item of items) {
    const t = result[item.date];
    if (!t || !t.projected || item.status === "paid" || item.amount === null) continue;
    if (item.kind === "receive") t.income += item.amount;
    else t.expense += item.amount;
  }
  for (const t of Object.values(result)) {
    t.income = Math.round(t.income * 100) / 100;
    t.expense = Math.round(t.expense * 100) / 100;
  }
  return result;
}

/** Status do item financeiro a partir do status salvo e do vencimento. */
export function financialStatus(saved: string, dueDate: string, today: string): FinancialStatus {
  if (saved === "paid") return "paid";
  return dueDate < today ? "overdue" : "pending";
}

export const FINANCIAL_STATUS_LABEL: Record<FinancialStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  overdue: "Atrasado",
};

export const FINANCIAL_KIND_LABEL: Record<FinancialItem["kind"], string> = {
  pay: "A pagar",
  receive: "A receber",
  tax: "Imposto",
};
