"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";

import { cn } from "@/lib/utils";

/**
 * Calendário (react-day-picker v9) no visual do Forge: dia escolhido em
 * círculo roxo, intervalo em faixa roxa clara, semana em português.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar p-3 [--cell-size:2.5rem]", className)}
      classNames={{
        root: cn("w-fit", defaults.root),
        months: cn("relative flex flex-col gap-4 sm:flex-row", defaults.months),
        month: cn("flex w-full flex-col gap-3", defaults.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaults.nav),
        button_previous: cn(
          "flex size-(--cell-size) items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-tint hover:text-foreground aria-disabled:opacity-40",
          defaults.button_previous
        ),
        button_next: cn(
          "flex size-(--cell-size) items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-tint hover:text-foreground aria-disabled:opacity-40",
          defaults.button_next
        ),
        month_caption: cn("flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)", defaults.month_caption),
        caption_label: cn("text-sm font-semibold capitalize text-foreground", defaults.caption_label),
        month_grid: "w-full border-collapse",
        weekdays: cn("flex", defaults.weekdays),
        weekday: cn("flex-1 select-none text-[0.75rem] font-medium uppercase text-muted-foreground", defaults.weekday),
        week: cn("mt-1 flex w-full", defaults.week),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          defaults.day
        ),
        range_start: cn("rounded-l-full bg-brand/15", defaults.range_start),
        range_middle: cn("rounded-none bg-brand/15", defaults.range_middle),
        range_end: cn("rounded-r-full bg-brand/15", defaults.range_end),
        today: cn("rounded-full bg-tint data-[selected=true]:rounded-none", defaults.today),
        outside: cn("text-muted-foreground/60 aria-selected:text-muted-foreground", defaults.outside),
        disabled: cn("text-muted-foreground opacity-40", defaults.disabled),
        hidden: cn("invisible", defaults.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rest }) => <div data-slot="calendar" ref={rootRef} className={cn(className)} {...rest} />,
        Chevron: ({ className, orientation, ...rest }) => {
          if (orientation === "left") return <ChevronLeftIcon className={cn("size-4", className)} {...rest} />;
          if (orientation === "right") return <ChevronRightIcon className={cn("size-4", className)} {...rest} />;
          return <ChevronDownIcon className={cn("size-4", className)} {...rest} />;
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString("pt-BR")}
      data-selected-single={modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "flex aspect-square size-auto w-full min-w-(--cell-size) items-center justify-center rounded-full text-sm tabular-nums text-foreground transition-colors",
        "hover:bg-tint-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        "data-[selected-single=true]:bg-brand data-[selected-single=true]:font-semibold data-[selected-single=true]:text-white",
        "data-[range-start=true]:bg-brand data-[range-start=true]:font-semibold data-[range-start=true]:text-white",
        "data-[range-end=true]:bg-brand data-[range-end=true]:font-semibold data-[range-end=true]:text-white",
        "data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-transparent",
        "disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
