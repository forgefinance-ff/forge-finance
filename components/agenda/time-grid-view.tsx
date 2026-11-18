"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { eventsByDay, isAllDayLike, layoutDay, segmentForDay, type DaySegment } from "@/lib/agenda/layout";
import { viewRange, type AgendaEvent, type FinancialItem } from "@/lib/agenda/shared";
import { addDays, minutesToTime, utcToLocal, WEEKDAY_SHORT } from "@/lib/agenda/time";
import { cn } from "@/lib/utils";

import type { ColorOf } from "./agenda-workspace";
import { EventChip, FinancialChip, tint } from "./chips";
import type { EventDraft } from "./event-dialog";

const HOUR_PX = 48;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/** Hora atual no fuso, atualizada a cada minuto (para a linha "agora"). */
function useNowMinutes() {
  const [now, setNow] = useState(() => utcToLocal(Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setNow(utcToLocal(Date.now())), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function TimeGridView({
  view,
  date,
  today,
  events,
  financial,
  colorOf,
  financialColor,
  onOpenEvent,
  onOpenFinancial,
  onCreate,
  onSwipe,
  onOpenDay,
}: {
  view: "dia" | "semana";
  date: string;
  today: string;
  events: AgendaEvent[];
  financial: FinancialItem[];
  colorOf: ColorOf;
  financialColor: string;
  onOpenEvent: (event: AgendaEvent) => void;
  onOpenFinancial: (item: FinancialItem) => void;
  onCreate: (preset: Partial<EventDraft>) => void;
  onSwipe: (direction: 1 | -1) => void;
  onOpenDay: (date: string) => void;
}) {
  const { start, end } = viewRange(view, date);
  const days = useMemo(() => {
    const list: string[] = [];
    for (let d = start; d < end; d = addDays(d, 1)) list.push(d);
    return list;
  }, [start, end]);

  const timed = useMemo(() => events.filter((e) => !isAllDayLike(e)), [events]);
  const allDay = useMemo(() => eventsByDay(events.filter(isAllDayLike), start, end), [events, start, end]);
  const finByDay = useMemo(() => {
    const map: Record<string, FinancialItem[]> = {};
    for (const item of financial) (map[item.date] ??= []).push(item);
    return map;
  }, [financial]);
  const placedByDay = useMemo(() => {
    const map: Record<string, ReturnType<typeof layoutDay>> = {};
    for (const day of days) {
      const segments = timed.map((e) => segmentForDay(e, day)).filter((s): s is DaySegment => s !== null);
      map[day] = layoutDay(segments);
    }
    return map;
  }, [days, timed]);

  const now = useNowMinutes();
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Abre perto do horário atual (ou às 7h).
    const target = days.includes(now.date) ? Math.max(0, now.minutes - 90) : 7 * 60;
    scroller.current?.scrollTo({ top: (target / 60) * HOUR_PX });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, start]);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const cols = `56px repeat(${days.length}, minmax(0, 1fr))`;
  const hasTop = days.some((d) => (allDay[d]?.length ?? 0) + (finByDay[d]?.length ?? 0) > 0);

  return (
    <div
      className="overflow-hidden rounded-[22px] border border-line bg-surface"
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
      {/* Cabeçalho dos dias */}
      <div className="grid border-b border-line" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((day) => {
          const isToday = day === today;
          return (
            <button
              key={day}
              type="button"
              onClick={() => view === "semana" && onOpenDay(day)}
              className="flex flex-col items-center gap-0.5 py-2"
              aria-current={isToday ? "date" : undefined}
            >
              <span className={cn("text-[11px] font-semibold uppercase tracking-wide", isToday ? "text-brand-bright" : "text-faint")}>
                {WEEKDAY_SHORT[new Date(`${day}T12:00:00Z`).getUTCDay()]}
              </span>
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-lg",
                  isToday ? "bg-brand font-semibold text-white" : "text-foreground"
                )}
              >
                {Number(day.slice(8))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dia inteiro e financeiro */}
      {hasTop && (
        <div className="grid border-b border-line" style={{ gridTemplateColumns: cols }}>
          <div className="px-1 py-1.5 text-right text-[10px] text-faint">dia todo</div>
          {days.map((day) => (
            <div key={day} className="min-w-0 space-y-0.5 border-l border-line p-1">
              {(finByDay[day] ?? []).map((item) => (
                <FinancialChip key={item.id} item={item} color={financialColor} showAmount={view === "dia"} onClick={() => onOpenFinancial(item)} />
              ))}
              {(allDay[day] ?? []).map((event) => (
                <EventChip key={`${event.id}-${day}`} event={event} color={colorOf(event)} onClick={() => onOpenEvent(event)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Grade de horas */}
      <div ref={scroller} className="max-h-[68dvh] overflow-y-auto overscroll-contain">
        <div className="relative grid" style={{ gridTemplateColumns: cols, height: 24 * HOUR_PX }}>
          <div className="relative">
            {HOURS.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-faint" style={{ top: h * HOUR_PX }}>
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>
          {days.map((day) => (
            <div
              key={day}
              className="relative cursor-pointer border-l border-line"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const minutes = Math.floor(((e.clientY - rect.top) / HOUR_PX) * 2) * 30;
                const startMin = Math.max(0, Math.min(minutes, 23 * 60));
                onCreate({
                  startDate: day,
                  endDate: day,
                  allDay: false,
                  startTime: minutesToTime(startMin),
                  endTime: minutesToTime(Math.min(startMin + 60, 24 * 60 - 1)),
                });
              }}
            >
              {HOURS.map((h) => (
                <div key={h} className="pointer-events-none absolute inset-x-0 border-t border-line/70" style={{ top: h * HOUR_PX }} />
              ))}
              {(placedByDay[day] ?? []).map((seg) => {
                const color = colorOf(seg.event);
                const top = (seg.startMin / 60) * HOUR_PX;
                const height = Math.max(((seg.endMin - seg.startMin) / 60) * HOUR_PX, 20);
                const width = 100 / seg.columns;
                const s = utcToLocal(seg.event.start);
                const e = utcToLocal(seg.event.end);
                return (
                  <button
                    key={`${seg.event.id}-${day}`}
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onOpenEvent(seg.event);
                    }}
                    className={cn(
                      "absolute overflow-hidden rounded-lg border-l-[3px] px-1.5 py-0.5 text-left text-[12px] leading-4 text-foreground shadow-sm transition hover:z-10 hover:brightness-110 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-brand",
                      seg.continuesBefore && "rounded-t-none",
                      seg.continuesAfter && "rounded-b-none"
                    )}
                    style={{
                      top,
                      height,
                      left: `calc(${seg.column * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      ...tint(color, 28),
                    }}
                    title={`${s.time}–${e.time} ${seg.event.title}`}
                  >
                    <span className="block truncate font-medium">{seg.event.title}</span>
                    {height >= 34 && (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {s.time} – {e.time}
                        {seg.event.location ? ` · ${seg.event.location}` : ""}
                      </span>
                    )}
                  </button>
                );
              })}
              {day === now.date && (
                <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: (now.minutes / 60) * HOUR_PX }} aria-hidden>
                  <div className="relative h-0.5 bg-danger">
                    <span className="absolute -left-1.5 -top-[5px] h-3 w-3 rounded-full bg-danger" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
