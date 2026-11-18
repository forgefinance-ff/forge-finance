"use client";

import { useMemo } from "react";

import { eventsByDay } from "@/lib/agenda/layout";
import { viewRange, type AgendaEvent, type DayTotals, type FinancialItem } from "@/lib/agenda/shared";
import { addDays, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/agenda/time";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import type { ColorOf } from "./agenda-workspace";
import { compactBRL, EventChip, FinancialChip } from "./chips";

const MAX_ITEMS = 3;

export function MonthView({
  date,
  today,
  events,
  financial,
  dayTotals,
  colorOf,
  financialColor,
  onOpenEvent,
  onOpenFinancial,
  onCreate,
  onOpenDay,
}: {
  date: string;
  today: string;
  events: AgendaEvent[];
  financial: FinancialItem[];
  dayTotals: Record<string, DayTotals> | null;
  colorOf: ColorOf;
  financialColor: string;
  onOpenEvent: (event: AgendaEvent) => void;
  onOpenFinancial: (item: FinancialItem) => void;
  onCreate: (date: string) => void;
  onOpenDay: (date: string) => void;
}) {
  const { start, end } = viewRange("mes", date);
  const month = date.slice(0, 7);
  const days = useMemo(() => Array.from({ length: 42 }, (_, i) => addDays(start, i)), [start]);
  const byDay = useMemo(() => eventsByDay(events, start, end), [events, start, end]);
  const finByDay = useMemo(() => {
    const map: Record<string, FinancialItem[]> = {};
    for (const item of financial) (map[item.date] ??= []).push(item);
    return map;
  }, [financial]);

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface">
      <div className="grid grid-cols-7 border-b border-line" role="row">
        {WEEKDAY_SHORT.map((d, i) => (
          <div key={d} role="columnheader" aria-label={WEEKDAY_LONG[i]} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-faint">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6" role="grid" aria-label="Mês">
        {days.map((day, i) => {
          const inMonth = day.slice(0, 7) === month;
          const isToday = day === today;
          const fin = finByDay[day] ?? [];
          const evs = byDay[day] ?? [];
          const total = fin.length + evs.length;
          const visibleFin = fin.slice(0, MAX_ITEMS);
          const visibleEv = evs.slice(0, Math.max(0, MAX_ITEMS - visibleFin.length));
          const hidden = total - visibleFin.length - visibleEv.length;
          const totals = dayTotals?.[day];
          return (
            <div
              key={day}
              role="gridcell"
              onClick={() => onCreate(day)}
              className={cn(
                "group relative min-h-[104px] cursor-pointer border-line p-1 transition-colors hover:bg-tint-strong/50 sm:min-h-[120px]",
                i % 7 !== 6 && "border-r",
                i < 35 && "border-b",
                !inMonth && "bg-tint/40"
              )}
            >
              <div className="mb-0.5 flex items-start justify-between gap-1 px-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDay(day);
                  }}
                  aria-label={`Abrir ${day.split("-").reverse().join("/")}`}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs transition-colors",
                    isToday ? "bg-brand font-semibold text-white" : inMonth ? "text-foreground hover:bg-tint-strong" : "text-faint hover:bg-tint-strong"
                  )}
                >
                  {Number(day.slice(8))}
                </button>
                {totals && (totals.income > 0 || totals.expense > 0) && (
                  <span
                    className={cn("flex flex-col items-end text-[10px] leading-3 tabular-nums", totals.projected && "opacity-70")}
                    title={`${totals.projected ? "Previsto" : "Realizado"}: entra ${formatCurrency(totals.income)} · sai ${formatCurrency(totals.expense)}`}
                  >
                    {totals.income > 0 && <span className="text-success">+{compactBRL(totals.income)}</span>}
                    {totals.expense > 0 && <span className="text-danger">−{compactBRL(totals.expense)}</span>}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {visibleFin.map((item) => (
                  <FinancialChip key={item.id} item={item} color={financialColor} showAmount={false} onClick={() => onOpenFinancial(item)} />
                ))}
                {visibleEv.map((event) => (
                  <EventChip key={`${event.id}-${day}`} event={event} color={colorOf(event)} onClick={() => onOpenEvent(event)} compact />
                ))}
                {hidden > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDay(day);
                    }}
                    className="w-full rounded-md px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:bg-tint-strong hover:text-foreground"
                  >
                    +{hidden} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
