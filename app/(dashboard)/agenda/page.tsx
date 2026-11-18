import { redirect } from "next/navigation";

import { AgendaWorkspace } from "@/components/agenda/agenda-workspace";
import { getAccounts } from "@/lib/accounts";
import { getActualTotals, getAgendaAccess, getCalendars, getEvents, getFinancialItems } from "@/lib/agenda/data";
import { buildDayTotals, parseView, viewRange, type AgendaView } from "@/lib/agenda/shared";
import { isIsoDate, localToUtcIso, todayLocal } from "@/lib/agenda/time";

export const metadata = { title: "Agenda · Forge Finance" };

type SearchParams = { view?: string | string[]; data?: string | string[]; ver?: string | string[] };

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AgendaPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const today = todayLocal();
  const explicitView = parseView(first(params.view));
  const view: AgendaView = explicitView ?? "mes";
  const date = isIsoDate(first(params.data)) ? (first(params.data) as string) : today;
  const showAll = first(params.ver) === "tudo";

  const ctx = await getAgendaAccess(showAll);
  if (!ctx) redirect("/login");
  const { db, access } = ctx;

  const { start, end } = viewRange(view, date);
  const startUtc = localToUtcIso(start);
  const endUtc = localToUtcIso(end);

  const calendars = await getCalendars(db, access.userId, access.scopes);
  const financialVisible = access.scopes.filter((scope) =>
    calendars.some((c) => c.scope === scope && c.kind === "financial" && c.isVisible)
  );

  const [events, financial, actual, accounts] = await Promise.all([
    getEvents(db, access.userId, access.scopes, startUtc, endUtc),
    getFinancialItems(db, access.userId, financialVisible, start, end, today),
    view === "mes" && financialVisible.length > 0
      ? getActualTotals(db, financialVisible, start, end)
      : Promise.resolve([]),
    getAccounts({ allScopes: true }),
  ]);

  const visibleCalendars = new Set(calendars.filter((c) => c.isVisible).map((c) => c.id));
  const dayTotals = view === "mes" && financialVisible.length > 0
    ? buildDayTotals(start, end, today, actual, financial)
    : null;

  return (
    <AgendaWorkspace
      view={view}
      explicitView={explicitView !== null}
      date={date}
      today={today}
      showAll={showAll}
      canShowAll={access.canBusiness}
      activeScope={access.activeScope}
      calendars={calendars}
      events={events.filter((e) => visibleCalendars.has(e.calendarId))}
      financial={financial}
      dayTotals={dayTotals}
      accounts={accounts
        .filter((a) => access.scopes.includes(a.scope as "personal" | "business"))
        .map((a) => ({ id: a.id, name: a.name, scope: a.scope as "personal" | "business" }))}
    />
  );
}
