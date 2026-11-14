import Link from "next/link";

import { LearnChevron } from "@/components/motion";
import type { RecentTransaction } from "@/lib/dashboard";
import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/** Últimas transações em linhas simples: nome, categoria e data, valor à direita. */
export function RecentList({ transactions }: { transactions: RecentTransaction[] }) {
  const rows = transactions.slice(0, 6);

  return (
    <section className="forge-panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="forge-panel-title">Últimas transações</h2>
        <Link href="/transacoes" className="t-learn inline-flex min-h-6 items-center gap-0.5 text-sm font-medium text-brand">
          Ver todas
          <LearnChevron />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-faint">
          Suas transações aparecem aqui assim que você registrar a primeira.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {rows.map((tx, index) => {
            const income = tx.type === "income";
            return (
              <li
                key={tx.id}
                className="t-reveal-item flex items-center gap-3 py-3"
                style={{ "--i": index } as React.CSSProperties}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-[family-name:var(--font-display)] text-sm",
                    income ? "bg-success/10 text-success" : "bg-tint-strong text-text-soft"
                  )}
                >
                  {(tx.category || tx.title || "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{tx.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {tx.category} · {formatDateBR(String(tx.transactionDate).slice(0, 10))}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    income ? "text-success" : "text-foreground"
                  )}
                >
                  {income ? "+" : "−"}
                  {formatCurrency(tx.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
