import Link from "next/link";
import { AlertTriangleIcon, ArrowRightIcon, CalendarClockIcon } from "lucide-react";

import { daysBetween, formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import type { DueSummary } from "@/lib/payables";
import { cn } from "@/lib/utils";

function relativeDay(dueDate: string, today: string) {
  const days = daysBetween(today, dueDate);
  if (days === 0) return "hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

/** "Próximos vencimentos (7 dias)" e total em atraso. Some se não há nada. */
export function DueSoonCard({ summary, today }: { summary: DueSummary; today: string }) {
  if (summary.overdueCount === 0 && summary.upcoming.length === 0) return null;

  const next = summary.upcoming.slice(0, 4);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Link
        href="/contas-a-pagar-receber?status=atrasadas"
        className={cn(
          "group flex flex-col justify-between rounded-[22px] border bg-surface p-5 transition",
          summary.overdueCount
            ? "border-danger/40 hover:border-danger/60"
            : "border-line hover:border-line-strong"
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total em atraso</span>
          <AlertTriangleIcon
            className={cn("h-4 w-4", summary.overdueCount ? "text-danger" : "text-faint")}
          />
        </div>
        <p
          className={cn(
            "mt-2 text-2xl font-semibold tabular-nums",
            summary.overdueCount ? "text-danger" : "text-foreground"
          )}
        >
          {formatCurrency(summary.overdueTotal)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-faint">
          {summary.overdueCount
            ? `${summary.overdueCount} ${summary.overdueCount === 1 ? "conta" : "contas"} a pagar ou receber`
            : "Nada atrasado 🎉"}
          <ArrowRightIcon className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </p>
      </Link>

      <section className="rounded-[22px] border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClockIcon className="h-4 w-4 text-brand-soft" />
            Próximos vencimentos (7 dias)
          </h2>
          <Link
            href="/contas-a-pagar-receber"
            className="text-xs font-medium text-brand-soft hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {next.length === 0 ? (
          <p className="mt-4 text-sm text-faint">Nenhum vencimento nos próximos 7 dias.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {next.map((payable) => (
              <li key={payable.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {payable.description}
                  </p>
                  <p className="text-xs text-faint">
                    {payable.kind === "receivable" ? "A receber" : "A pagar"} ·{" "}
                    {formatDateBR(payable.due_date)} ({relativeDay(payable.due_date, today)})
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    payable.kind === "receivable" ? "text-success" : "text-foreground"
                  )}
                >
                  {payable.kind === "receivable" ? "+" : "−"}
                  {formatCurrency(payable.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
