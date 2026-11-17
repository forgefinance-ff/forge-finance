"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateToIso, isoToBR, isoToDate } from "@/lib/date-iso";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  /** Nome do campo no formulário (vai num input escondido como YYYY-MM-DD). */
  name: string;
  defaultValue: string;
  /** Hoje (YYYY-MM-DD), para o atalho "Hoje". */
  today: string;
  className?: string;
  onChange?: (value: string) => void;
};

/** Campo de data com calendário no visual do Forge (substitui o input date nativo). */
export function DatePicker({ id, name, defaultValue, today, className, onChange }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const selected = isoToDate(value);

  function pick(next: string) {
    setValue(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          className={cn("flex items-center justify-between gap-2 text-left", className)}
          aria-label={`Data: ${isoToBR(value)}. Abrir calendário`}
        >
          <span className="tabular-nums">{isoToBR(value)}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto rounded-2xl p-0">
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => date && pick(dateToIso(date))}
          />
          <div className="flex justify-between border-t border-line px-3 py-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-sm font-medium text-brand hover:bg-tint"
              onClick={() => pick(today)}
            >
              Hoje
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-tint"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
