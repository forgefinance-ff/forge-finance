"use client";

import { useMemo, useRef } from "react";
import { CalendarCheckIcon, MapPinIcon, VideoIcon } from "lucide-react";

import { eventsByDay, isAllDayLike } from "@/lib/agenda/layout";
import { viewRange, type AgendaEvent, type FinancialItem } from "@/lib/agenda/shared";
import { addDays, MONTH_SHORT, utcToLocal, weekday, WEEKDAY_LONG } from "@/lib/agenda/time";
import { cn } from "@/lib/utils";

import type { ColorOf } from "./agenda-workspace";
import { FinancialChip } from "./chips";

/** Próximos 30 dias, só os dias com algo marcado. */
export function ListView({
  date,
  today,
  events,
  financial,
  colorOf,
  financialColor,
  onOpenEvent,
  onOpenFinancial,
  onSwipe,
}: {
  date: string;
  today: string;
  events: AgendaEvent[];
  financial: FinancialItem[];
  colorOf: ColorOf;
  financialColor: string;
  onOpenEvent: (event: AgendaEvent) => void;
  onOpenFinancial: (item: FinancialItem) => void;
  onSwipe: (direction: 1 | -1) => void;
}) {
  const { start, end } = viewRange("lista", date);
  const byDay = useMemo(() => eventsByDay(events, start, end), [events, start, end]);
  const finByDay = useMemo(() => {
    const map: Record<string, FinancialItem[]> = {};
    for (const item of financial) (map[item.date] ??= []).push(item);
    return map;
  }, [financial]);

  const days: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) {
    if ((byDay[d]?.length ?? 0) + (finByDay[d]?.length ?? 0) > 0) days.push(d);
  }

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      className="space-y-3"
      onTouchStart={(e) => (touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const s = touchStart.current;
        touchStart.current = null;
        if (!s) return;
        const dx = e.changedTouches[0].clientX - s.x;
        const dy = e.changedTouches[0].clientY - s.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
      }}
    >
      {days.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[22px] border border-dashed border-line-strong px-6 py-14 text-center">
          <CalendarCheckIcon className="h-8 w-8 text-faint" />
          <p className="font-medium text-foreground">Nada marcado nos próximos 30 dias</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Crie um compromisso no botão + ou cadastre contas a pagar e receber para elas aparecerem aqui sozinhas.
          </p>
        </div>
      )}

      {days.map((day) => {
        const [, m, d] = day.split("-").map(Number);
        const isToday = day === today;
        return (
          <section key={day} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 rounded-[22px] border border-line bg-surface p-3 sm:grid-cols-[72px_minmax(0,1fr)]">
            <div className="flex flex-col items-center pt-1">
              <span className={cn("text-[11px] font-semibold uppercase", isToday ? "text-brand-bright" : "text-faint")}>
                {WEEKDAY_LONG[weekday(day)].slice(0, 3)}
              </span>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-lg",
                  isToday ? "bg-brand font-semibold text-white" : "text-foreground"
                )}
              >
                {d}
              </span>
              <span className="text-[11px] text-faint">{MONTH_SHORT[m - 1]}</span>
            </div>
            <ul className="min-w-0 space-y-1.5">
              {(finByDay[day] ?? []).map((item) => (
                <li key={item.id}>
                  <FinancialChip item={item} color={financialColor} onClick={() => onOpenFinancial(item)} />
                </li>
              ))}
              {(byDay[day] ?? []).map((event) => {
                const color = colorOf(event);
                const s = utcToLocal(event.start);
                const e = utcToLocal(event.end);
                return (
                  <li key={`${event.id}-${day}`}>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event)}
                      className="flex w-full min-w-0 items-start gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-tint-strong focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="w-20 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {isAllDayLike(event) ? "Dia todo" : `${s.time}–${e.time}`}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{event.title}</span>
                        {(event.location || event.meetingUrl) && (
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            {event.meetingUrl ? <VideoIcon className="h-3 w-3" /> : <MapPinIcon className="h-3 w-3" />}
                            {event.location ?? "Reunião online"}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
