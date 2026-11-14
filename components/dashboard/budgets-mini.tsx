import Link from "next/link";

import { BudgetBar } from "@/components/budgets/budget-bar";
import { LearnChevron } from "@/components/motion";
import type { Budget } from "@/lib/budgets";

/** Até 3 orçamentos (os mais apertados) no topo do dashboard. */
export function BudgetsMini({ budgets }: { budgets: Budget[] }) {
  if (budgets.length === 0) {
    return (
      <section className="forge-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted-foreground">
          Defina um limite por categoria e veja aqui se o mês está no ritmo.
        </p>
        <Link href="/orcamentos" className="t-learn inline-flex min-h-6 items-center gap-0.5 text-sm font-medium text-brand">
          Criar orçamento
          <LearnChevron />
        </Link>
      </section>
    );
  }

  return (
    <section className="forge-panel p-5 sm:p-6" aria-labelledby="budgets-mini-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="budgets-mini-title" className="forge-panel-title">
          Orçamentos do mês
        </h2>
        <Link href="/orcamentos" className="t-learn inline-flex min-h-6 items-center gap-0.5 text-sm font-medium text-brand">
          Ver todos
          <LearnChevron />
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        {budgets.slice(0, 3).map((b) => (
          <li key={b.id}>
            <BudgetBar budget={b} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
