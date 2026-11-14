import type { Budget } from "@/lib/budgets";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** Linha de um orçamento: nome, gasto/limite, barra e aviso de ritmo. */
export function BudgetBar({ budget: b, compact = false }: { budget: Budget; compact?: boolean }) {
  const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
  const tone = b.status === "over" ? "bg-danger" : b.status === "attention" ? "bg-amber-500" : "bg-success";

  const note =
    b.status === "over"
      ? `Passou ${formatCurrency(b.spent - b.limit)} do limite.`
      : b.overrunDay !== null
        ? `No ritmo atual, estoura por volta do dia ${b.overrunDay}.`
        : `Faltam ${formatCurrency(b.remaining)} para o limite.`;

  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn("truncate font-medium text-foreground", compact && "text-sm")}>
          <span aria-hidden className="mr-1.5">
            {b.icon}
          </span>
          {b.name}
        </p>
        <p className={cn("shrink-0 tabular-nums text-text-soft", compact ? "text-xs" : "text-sm")}>
          <strong className="text-foreground">{formatCurrency(b.spent)}</strong> / {formatCurrency(b.limit)}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Orçamento de ${b.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}% usado`}
        className={cn("mt-2 overflow-hidden rounded-full bg-tint-strong", compact ? "h-1.5" : "h-2")}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${pct}%` }} />
      </div>
      <p
        className={cn(
          "mt-1.5 text-xs",
          b.status === "over" ? "text-danger" : b.status === "attention" ? "text-amber-600 dark:text-amber-400" : "text-faint"
        )}
      >
        {note}
      </p>
    </div>
  );
}
