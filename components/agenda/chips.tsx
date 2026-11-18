"use client";

import { CheckCircle2Icon, CircleAlertIcon, ReceiptIcon } from "lucide-react";

import type { AgendaEvent, FinancialItem } from "@/lib/agenda/shared";
import { utcToLocal } from "@/lib/agenda/time";
import { isAllDayLike } from "@/lib/agenda/layout";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** Fundo translúcido + borda na cor do evento (funciona no claro e no escuro). */
export function tint(color: string, amount = 22) {
  return {
    background: `color-mix(in oklch, ${color} ${amount}%, transparent)`,
    borderColor: color,
  } as const;
}

export function EventChip({
  event,
  color,
  onClick,
  compact = false,
}: {
  event: AgendaEvent;
  color: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const allDay = isAllDayLike(event);
  const time = allDay ? null : utcToLocal(event.start).time;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={time ? `${time} ${event.title}` : event.title}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 truncate rounded-md px-1.5 text-left text-[12px] leading-5 text-foreground transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-brand",
        allDay ? "border-l-[3px]" : "",
        compact && "py-0"
      )}
      style={allDay ? tint(color) : undefined}
    >
      {!allDay && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />}
      {time && <span className="shrink-0 text-muted-foreground">{time}</span>}
      <span className={cn("truncate", event.kind === "task" && event.taskDone && "line-through opacity-60")}>{event.title}</span>
    </button>
  );
}

export function FinancialChip({
  item,
  color,
  onClick,
  showAmount = true,
}: {
  item: FinancialItem;
  color: string;
  onClick: () => void;
  showAmount?: boolean;
}) {
  const Icon = item.status === "paid" ? CheckCircle2Icon : item.status === "overdue" ? CircleAlertIcon : ReceiptIcon;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={`${item.title}${item.amount !== null ? ` · ${formatCurrency(item.amount)}` : ""}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1 truncate rounded-md border-l-[3px] px-1.5 text-left text-[12px] leading-5 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-brand",
        item.status === "paid" ? "text-muted-foreground" : "text-foreground"
      )}
      style={tint(
        item.status === "overdue" ? "var(--danger)" : item.kind === "receive" ? "var(--success)" : color,
        item.status === "paid" ? 10 : 20
      )}
    >
      <Icon className={cn("h-3 w-3 shrink-0", item.status === "overdue" && "text-danger", item.status === "paid" && "text-success")} />
      <span className={cn("truncate", item.status === "paid" && "line-through")}>{item.title}</span>
      {showAmount && item.amount !== null && (
        <span className={cn("ml-auto shrink-0 pl-1 tabular-nums", item.kind === "receive" ? "text-success" : "text-muted-foreground")}>
          {item.kind === "receive" ? "+" : "−"}
          {formatCurrency(item.amount).replace(/\s/g, " ")}
        </span>
      )}
    </button>
  );
}

/** Valor curto para o resumo do dia: 1.250 -> "1,3 mil". */
export function compactBRL(value: number) {
  if (value >= 1000) return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}
