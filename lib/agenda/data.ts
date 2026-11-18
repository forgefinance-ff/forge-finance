
import { canUseBusiness, getActiveScope } from "@/lib/scope-server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

import {
  financialStatus,
  isAgendaColor,
  type AgendaCalendar,
  type AgendaColor,
  type AgendaEvent,
  type AgendaScope,
  type FinancialItem,
} from "./shared";
import { addDays, addMonths, daysInMonth, MONTH_SHORT } from "./time";

type Db = Awaited<ReturnType<typeof createClient>>;

/** Agendas criadas na primeira visita, por escopo. */
const DEFAULT_CALENDARS: Record<AgendaScope, { name: string; color: AgendaColor; kind: "custom" | "financial" }[]> = {
  personal: [
    { name: "Pessoal", color: "violeta", kind: "custom" },
    { name: "Financeiro automático", color: "ambar", kind: "financial" },
  ],
  business: [
    { name: "Empresa", color: "azul", kind: "custom" },
    { name: "Clientes", color: "verde", kind: "custom" },
    { name: "Financeiro automático", color: "ambar", kind: "financial" },
  ],
};

export type AgendaAccess = {
  userId: string;
  activeScope: AgendaScope;
  canBusiness: boolean;
  /** Escopos mostrados agora ("ver tudo" = os dois, se tiver Empresa). */
  scopes: AgendaScope[];
};

export async function getAgendaAccess(showAll: boolean): Promise<{ db: Db; access: AgendaAccess } | null> {
  const user = await getAuthUser();
  if (!user) return null;
  const [db, activeScope, canBusiness] = await Promise.all([createClient(), getActiveScope(), canUseBusiness()]);
  const scopes: AgendaScope[] = showAll && canBusiness ? ["personal", "business"] : [activeScope];
  return { db, access: { userId: user.id, activeScope, canBusiness, scopes } };
}

type CalendarRow = {
  id: string;
  scope: AgendaScope;
  kind: "custom" | "financial";
  name: string;
  color: string;
  is_visible: boolean;
  position: number;
};

function toCalendar(row: CalendarRow): AgendaCalendar {
  return {
    id: row.id,
    scope: row.scope,
    kind: row.kind,
    name: row.name,
    color: isAgendaColor(row.color) ? row.color : "violeta",
    isVisible: row.is_visible,
  };
}

/** Agendas dos escopos pedidos; cria as padrão de quem ainda não tem nenhuma. */
export async function getCalendars(db: Db, userId: string, scopes: AgendaScope[]): Promise<AgendaCalendar[]> {
  const read = () =>
    db
      .from("calendars")
      .select("id, scope, kind, name, color, is_visible, position")
      .eq("user_id", userId)
      .in("scope", scopes)
      .order("scope", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

  let { data, error } = await read();
  if (error) throw error;

  const rows = (data ?? []) as CalendarRow[];
  const missing = scopes.filter((scope) => !rows.some((r) => r.scope === scope));
  if (missing.length > 0) {
    const inserts = missing.flatMap((scope) =>
      DEFAULT_CALENDARS[scope].map((c, i) => ({ user_id: userId, scope, kind: c.kind, name: c.name, color: c.color, position: i }))
    );
    const { error: insertError } = await db.from("calendars").insert(inserts);
    // Corrida entre duas abas: o índice único da agenda financeira recusa a segunda.
    if (insertError && insertError.code !== "23505") throw insertError;
    ({ data, error } = await read());
    if (error) throw error;
  }

  return ((data ?? []) as CalendarRow[]).map(toCalendar);
}

type EventRow = {
  id: string;
  calendar_id: string;
  scope: AgendaScope;
  kind: "event" | "task";
  title: string;
  description: string | null;
  location: string | null;
  meeting_url: string | null;
  color: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string;
  task_done: boolean;
  event_attendees: { name: string; email: string | null; phone: string | null }[] | null;
};

function toEvent(row: EventRow): AgendaEvent {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    scope: row.scope,
    kind: row.kind,
    title: row.title,
    description: row.description,
    location: row.location,
    meetingUrl: row.meeting_url,
    color: isAgendaColor(row.color) ? row.color : null,
    allDay: row.all_day,
    start: new Date(row.starts_at).toISOString(),
    end: new Date(row.ends_at).toISOString(),
    taskDone: row.task_done,
    attendees: (row.event_attendees ?? []).map((a) => ({ name: a.name, email: a.email, phone: a.phone })),
  };
}

/** Eventos que cruzam [startUtc, endUtc). Só o intervalo visível é lido. */
export async function getEvents(
  db: Db,
  userId: string,
  scopes: AgendaScope[],
  startUtc: string,
  endUtc: string
): Promise<AgendaEvent[]> {
  const { data, error } = await db
    .from("events")
    .select(
      "id, calendar_id, scope, kind, title, description, location, meeting_url, color, all_day, starts_at, ends_at, task_done, event_attendees(name, email, phone)"
    )
    .eq("user_id", userId)
    .in("scope", scopes)
    .is("rrule", null)
    .lt("starts_at", endUtc)
    .or(`ends_at.gt.${startUtc},and(starts_at.gte.${startUtc},ends_at.eq.${startUtc})`)
    .order("starts_at", { ascending: true })
    .limit(2000);

  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[]).map(toEvent);
}

type PayableRow = {
  id: string;
  scope: AgendaScope;
  kind: "payable" | "receivable";
  description: string;
  amount: number | string;
  due_date: string;
  status: "pending" | "paid" | "canceled";
  customers: { name: string } | { name: string }[] | null;
};

type DasRow = { id: string; competence: string; amount: number | string; due_date: string; status: string };

type MeiSettingsRow = { das_due_day: number | string; das_amount: number | string | null; dasn_due_date: string | null };

function firstName(rel: PayableRow["customers"]): string | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0]?.name ?? null : rel.name;
}

/**
 * Itens financeiros do intervalo, lidos das tabelas reais (nada é copiado):
 * contas a pagar e a receber (com cobranças a clientes), guias do DAS,
 * o próximo DAS ainda não gerado e a DASN anual.
 */
export async function getFinancialItems(
  db: Db,
  userId: string,
  scopes: AgendaScope[],
  start: string,
  end: string,
  today: string
): Promise<FinancialItem[]> {
  if (scopes.length === 0) return [];
  const last = addDays(end, -1);
  const business = scopes.includes("business");

  const [payablesRes, dasRes, settingsRes] = await Promise.all([
    db
      .from("payables")
      .select("id, scope, kind, description, amount, due_date, status, customers(name)")
      .eq("user_id", userId)
      .in("scope", scopes)
      .neq("status", "canceled")
      .gte("due_date", start)
      .lte("due_date", last)
      .order("due_date", { ascending: true })
      .limit(1000),
    business
      ? db
          .from("mei_das_payments")
          .select("id, competence, amount, due_date, status")
          .eq("user_id", userId)
          .gte("due_date", addMonths(start, -2))
          .lte("due_date", addMonths(last, 2))
      : Promise.resolve({ data: [], error: null }),
    business
      ? db.from("mei_settings").select("das_due_day, das_amount, dasn_due_date").eq("user_id", userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (payablesRes.error) throw payablesRes.error;
  if (dasRes.error) throw dasRes.error;
  if (settingsRes.error) throw settingsRes.error;

  const items: FinancialItem[] = [];

  for (const row of (payablesRes.data ?? []) as unknown as PayableRow[]) {
    const due = String(row.due_date).slice(0, 10);
    const receivable = row.kind === "receivable";
    const customer = firstName(row.customers);
    items.push({
      id: `payable:${row.id}`,
      source: "payable",
      kind: receivable ? "receive" : "pay",
      scope: row.scope,
      title: customer && receivable ? `${row.description} · ${customer}` : row.description,
      amount: Number(row.amount),
      date: due,
      status: financialStatus(row.status, due, today),
      customer,
      payableId: row.id,
      href: `/contas-a-pagar-receber${receivable ? "?aba=receber" : ""}`,
    });
  }

  if (business) {
    const das = (dasRes.data ?? []) as DasRow[];
    const settings = settingsRes.data as MeiSettingsRow | null;
    const competences = new Set(das.map((d) => String(d.competence).slice(0, 7)));

    for (const row of das) {
      const due = String(row.due_date).slice(0, 10);
      if (due < start || due > last) continue;
      const [y, m] = String(row.competence).split("-").map(Number);
      items.push({
        id: `das:${row.id}`,
        source: "das",
        kind: "tax",
        scope: "business",
        title: `DAS do MEI (${MONTH_SHORT[m - 1]}/${y})`,
        amount: Number(row.amount),
        date: due,
        status: financialStatus(row.status, due, today),
        customer: null,
        payableId: null,
        href: "/impostos",
      });
    }

    // DAS ainda não gerado: todo mês, no dia configurado (padrão 20), só de hoje em diante.
    const dueDay = Math.min(31, Math.max(1, Number(settings?.das_due_day ?? 20) || 20));
    for (let month = `${start.slice(0, 7)}-01`; month <= last; month = addMonths(month, 1)) {
      const [y, m] = month.split("-").map(Number);
      const due = `${month.slice(0, 7)}-${String(Math.min(dueDay, daysInMonth(y, m))).padStart(2, "0")}`;
      if (due < start || due > last || due < today) continue;
      const competence = addMonths(month, -1).slice(0, 7);
      if (competences.has(competence)) continue;
      const [cy, cm] = competence.split("-").map(Number);
      items.push({
        id: `das-next:${competence}`,
        source: "das-next",
        kind: "tax",
        scope: "business",
        title: `DAS do MEI (${MONTH_SHORT[cm - 1]}/${cy}) · gerar guia`,
        amount: settings?.das_amount != null ? Number(settings.das_amount) : null,
        date: due,
        status: "pending",
        customer: null,
        payableId: null,
        href: "/impostos",
      });
    }

    // DASN-SIMEI: data configurada ou 31 de maio de cada ano.
    for (let year = Number(start.slice(0, 4)); year <= Number(last.slice(0, 4)); year++) {
      const configured = settings?.dasn_due_date && String(settings.dasn_due_date).startsWith(String(year))
        ? String(settings.dasn_due_date).slice(0, 10)
        : `${year}-05-31`;
      // Datas passadas ficam de fora: o app não sabe se a declaração já foi entregue.
      if (configured < start || configured > last || configured < today) continue;
      items.push({
        id: `dasn:${year}`,
        source: "dasn",
        kind: "tax",
        scope: "business",
        title: `DASN-SIMEI ${year - 1} (declaração anual do MEI)`,
        amount: null,
        date: configured,
        status: "pending",
        customer: null,
        payableId: null,
        href: "/impostos",
      });
    }
  }

  return items;
}

/** Receitas e despesas lançadas por dia (realizado), somando os escopos. */
export async function getActualTotals(db: Db, scopes: AgendaScope[], start: string, end: string) {
  const last = addDays(end, -1);
  const results = await Promise.all(
    scopes.map((scope) => db.rpc("ff_daily_totals", { p_scope: scope, p_from: start, p_to: last }))
  );
  const map = new Map<string, { day: string; income: number; expense: number }>();
  for (const res of results) {
    if (res.error) throw res.error;
    for (const row of (res.data ?? []) as { day: string; income: number | string; expense: number | string }[]) {
      const day = String(row.day).slice(0, 10);
      const current = map.get(day) ?? { day, income: 0, expense: 0 };
      current.income += Number(row.income);
      current.expense += Number(row.expense);
      map.set(day, current);
    }
  }
  return [...map.values()];
}
