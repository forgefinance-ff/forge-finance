"use client";

import { type DateRange } from "react-day-picker";

import { Calendar } from "@/components/ui/calendar";

/**
 * Seleção de período (do prompt "calendar range select"), nas cores do Forge:
 * início e fim em círculo roxo, dias do meio em faixa roxa clara.
 */
export function CalendarRangeSelect({
  value,
  onChange,
  numberOfMonths = 1,
  className,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  numberOfMonths?: number;
  className?: string;
}) {
  return (
    <Calendar
      mode="range"
      defaultMonth={value?.from}
      selected={value}
      onSelect={onChange}
      numberOfMonths={numberOfMonths}
      className={className}
    />
  );
}

export default CalendarRangeSelect;
