"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeftIcon, ChevronRightIcon, LayersIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AGENDA_VIEWS,
  colorValue,
  rangeTitle,
  stepDate,
  VIEW_LABEL,
  type AgendaCalendar,
  type AgendaEvent,
  type AgendaScope,
  type AgendaView,
  type DayTotals,
  type FinancialItem,
} from "@/lib/agenda/shared";
import { cn } from "@/lib/utils";

import { CalendarList } from "./calendar-list";
import { draftFromEvent, EventDialog, type EventDraft } from "./event-dialog";
import { FinancialDialog } from "./financial-dialog";
import { MiniCalendar } from "./mini-calendar";
import { ListView } from "./list-view";
import { MonthView } from "./month-view";
import { TimeGridView } from "./time-grid-view";

export type AccountOption = { id: string; name: string; scope: AgendaScope };

type Props = {
  view: AgendaView;
  explicitView: boolean;
  date: string;
  today: string;
  showAll: boolean;
  canShowAll: boolean;
  activeScope: AgendaScope;
  calendars: AgendaCalendar[];
  events: AgendaEvent[];
  financial: FinancialItem[];
  dayTotals: Record<string, DayTotals> | null;
  accounts: AccountOption[];
};

/** Cor final do evento: a dele, ou a da agenda. */
export type ColorOf = (event: AgendaEvent) => string;

export function AgendaWorkspace(props: Props) {
  const { view, date, today, showAll, canShowAll, calendars, events, financial } = props;
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [selectedFinancial, setSelectedFinancial] = useState<FinancialItem | null>(null);
  const [calendarsOpen, setCalendarsOpen] = useState(false);

  const go = useCallback(
    (next: { view?: AgendaView; date?: string; showAll?: boolean }, replace = false) => {
      const params = new URLSearchParams();
      params.set("view", next.view ?? view);
      params.set("data", next.date ?? date);
      if (next.showAll ?? showAll) params.set("ver", "tudo");
      const url = `/agenda?${params.toString()}`;
      startNavigation(() => (replace ? router.replace(url) : router.push(url)));
    },
    [router, view, date, showAll]
  );

  // Celular: sem visão escolhida, abre na Lista.
  useEffect(() => {
    if (!props.explicitView && window.matchMedia("(max-width: 767px)").matches) {
      go({ view: "lista" }, true);
    }
    // só na primeira visita
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calendarById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);
  const colorOf: ColorOf = useCallback(
    (event) => colorValue(event.color ?? calendarById.get(event.calendarId)?.color ?? "violeta"),
    [calendarById]
  );
  const financialColor = useMemo(() => {
    const cal = calendars.find((c) => c.kind === "financial" && c.isVisible);
    return colorValue(cal?.color ?? "ambar");
  }, [calendars]);

  const writable = useMemo(() => calendars.filter((c) => c.kind === "custom"), [calendars]);
  const defaultCalendar =
    writable.find((c) => c.scope === props.activeScope && c.isVisible) ?? writable.find((c) => c.isVisible) ?? writable[0];

  const openCreate = useCallback(
    (preset?: Partial<EventDraft>) => {
      if (!defaultCalendar) return;
      const startDate = preset?.startDate ?? date;
      setDraft({
        id: null,
        calendarId: defaultCalendar.id,
        kind: "event",
        title: "",
        allDay: preset?.allDay ?? false,
        startDate,
        startTime: preset?.startTime ?? "09:00",
        endDate: preset?.endDate ?? startDate,
        endTime: preset?.endTime ?? "10:00",
        location: "",
        meetingUrl: "",
        description: "",
        color: "",
        attendees: [],
      });
    },
    [defaultCalendar, date]
  );

  const openEvent = useCallback((event: AgendaEvent) => setDraft(draftFromEvent(event)), []);

  // Atalhos de teclado (como no Google Agenda).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || draft || selectedFinancial) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (document.querySelector("[role='dialog']")) return;
      const key = e.key.toLowerCase();
      const map: Record<string, AgendaView> = { d: "dia", w: "semana", s: "semana", m: "mes", l: "lista", a: "lista" };
      if (map[key]) go({ view: map[key] });
      else if (key === "t") go({ date: today });
      else if (key === "c") openCreate();
      else if (key === "arrowleft" || key === "k" || key === "p") go({ date: stepDate(view, date, -1) });
      else if (key === "arrowright" || key === "j" || key === "n") go({ date: stepDate(view, date, 1) });
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, openCreate, today, view, date, draft, selectedFinancial]);

  const sidebar = (
    <div className="space-y-6">
      <MiniCalendar
        selected={date}
        today={today}
        onSelect={(d) => {
          setCalendarsOpen(false);
          go({ date: d });
        }}
      />
      <CalendarList calendars={calendars} canBusiness={canShowAll} activeScope={props.activeScope} />
      <p className="text-xs leading-relaxed text-faint">
        Atalhos: <kbd>d</kbd> dia · <kbd>w</kbd> semana · <kbd>m</kbd> mês · <kbd>l</kbd> lista · <kbd>t</kbd> hoje ·{" "}
        <kbd>c</kbd> criar · <kbd>←</kbd> <kbd>→</kbd> navegar
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Barra */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-normal tracking-[-0.03em] text-foreground sm:text-3xl">Agenda</h1>
        <Button variant="outline" size="sm" onClick={() => go({ date: today })} aria-keyshortcuts="t">
          Hoje
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon-sm" aria-label="Anterior" onClick={() => go({ date: stepDate(view, date, -1) })}>
            <ChevronLeftIcon />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Próximo" onClick={() => go({ date: stepDate(view, date, 1) })}>
            <ChevronRightIcon />
          </Button>
        </div>
        <p
          className={cn("min-w-0 flex-1 truncate text-base font-medium capitalize text-foreground transition-opacity", isNavigating && "opacity-60")}
          aria-live="polite"
        >
          {view === "lista" ? `A partir de ${rangeTitle("dia", date)}` : rangeTitle(view, date)}
        </p>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div role="tablist" aria-label="Visão" className="glass flex rounded-full border border-line p-1">
            {AGENDA_VIEWS.map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={v === view}
                onClick={() => go({ view: v })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  v === view ? "bg-brand text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>

          {canShowAll && (
            <button
              type="button"
              onClick={() => go({ showAll: !showAll })}
              aria-pressed={showAll}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                showAll ? "border-brand-bright/50 bg-brand/15 text-foreground" : "border-line text-muted-foreground hover:text-foreground"
              )}
            >
              Ver Pessoal + Empresa
            </button>
          )}

          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setCalendarsOpen(true)}>
            <LayersIcon /> Agendas
          </Button>

          <Button size="sm" className="hidden md:inline-flex" onClick={() => openCreate()} aria-keyshortcuts="c">
            <PlusIcon /> Criar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">{sidebar}</aside>

        <section className={cn("min-w-0 transition-opacity", isNavigating && "opacity-70")} aria-busy={isNavigating}>
          {view === "mes" && (
            <MonthView
              date={date}
              today={today}
              events={events}
              financial={financial}
              dayTotals={props.dayTotals}
              colorOf={colorOf}
              financialColor={financialColor}
              onOpenEvent={openEvent}
              onOpenFinancial={setSelectedFinancial}
              onCreate={(d) => openCreate({ startDate: d, endDate: d, allDay: true })}
              onOpenDay={(d) => go({ view: "dia", date: d })}
            />
          )}
          {(view === "semana" || view === "dia") && (
            <TimeGridView
              view={view}
              date={date}
              today={today}
              events={events}
              financial={financial}
              colorOf={colorOf}
              financialColor={financialColor}
              onOpenEvent={openEvent}
              onOpenFinancial={setSelectedFinancial}
              onCreate={(preset) => openCreate(preset)}
              onSwipe={(dir) => go({ date: stepDate(view, date, dir) })}
              onOpenDay={(d) => go({ view: "dia", date: d })}
            />
          )}
          {view === "lista" && (
            <ListView
              date={date}
              today={today}
              events={events}
              financial={financial}
              colorOf={colorOf}
              financialColor={financialColor}
              onOpenEvent={openEvent}
              onOpenFinancial={setSelectedFinancial}
              onSwipe={(dir) => go({ date: stepDate("dia", date, dir) })}
            />
          )}
        </section>
      </div>

      {/* Criar no celular */}
      <button
        type="button"
        onClick={() => openCreate()}
        aria-label="Criar evento"
        className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30 transition active:scale-95 md:hidden"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      <Sheet open={calendarsOpen} onOpenChange={setCalendarsOpen}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Agendas</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{sidebar}</div>
        </SheetContent>
      </Sheet>

      <EventDialog draft={draft} calendars={writable} onClose={() => setDraft(null)} onSaved={() => router.refresh()} />

      <FinancialDialog
        item={selectedFinancial}
        accounts={props.accounts}
        today={today}
        onClose={() => setSelectedFinancial(null)}
        onSettled={() => router.refresh()}
      />
    </div>
  );
}
