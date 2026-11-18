"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { monthGrid } from "@/lib/agenda/shared";
import { addMonths, MONTH_LONG, WEEKDAY_SHORT } from "@/lib/agenda/time";
import { cn } from "@/lib/utils";

/** Mini calendário lateral: navega por mês sem recarregar e escolhe um dia. */
export function MiniCalendar({
  selected,
  today,
  onSelect,
}: {
  selected: string;
  today: string;
  onSelect: (date: string) => void;
}) {
  const [state, setState] = useState({ for: selected, month: `${selected.slice(0, 7)}-01` });
  // Outro dia escolhido fora daqui: volta para o mês dele.
  if (state.for !== selected) setState({ for: selected, month: `${selected.slice(0, 7)}-01` });
  const month = state.for === selected ? state.month : `${selected.slice(0, 7)}-01`;
  const setMonth = (next: string) => setState({ for: selected, month: next });

  const [y, m] = month.split("-").map(Number);
  const days = monthGrid(month);

  return (
    <div className="rounded-[22px] border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="pl-1 text-sm font-medium capitalize text-foreground">
          {MONTH_LONG[m - 1]} {y}
        </p>
        <div className="flex">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => setMonth(addMonths(month, -1))}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-tint-strong hover:text-foreground"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => setMonth(addMonths(month, 1))}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-tint-strong hover:text-foreground"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-faint" aria-hidden>
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="py-1">
            {d[0].toUpperCase()}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-xs" role="grid" aria-label={`${MONTH_LONG[m - 1]} de ${y}`}>
        {days.map((d) => {
          const inMonth = d.slice(0, 7) === month.slice(0, 7);
          const isToday = d === today;
          const isSelected = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-label={d.split("-").reverse().join("/")}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              className={cn(
                "mx-auto my-0.5 flex h-7 w-7 items-center justify-center rounded-full transition-colors",
                !inMonth && "text-faint/60",
                inMonth && "text-foreground",
                isToday && "bg-brand font-semibold text-white",
                isSelected && !isToday && "bg-brand/15 font-semibold text-brand-bright",
                !isToday && !isSelected && "hover:bg-tint-strong"
              )}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
