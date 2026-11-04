import Link from "next/link";

import type { buildDelinquency } from "@/lib/business-calc";

import { brl } from "./format";

type Delinquency = ReturnType<typeof buildDelinquency>;

export function DelinquencyCard({ delinquency }: { delinquency: Delinquency }) {
  const d = delinquency;

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inadimplência e clientes</h2>
          <p className="text-sm text-muted-foreground">
            Pelas contas a receber com cliente. Cobre pelo WhatsApp em Contas a pagar/receber.
          </p>
        </div>
        <Link
          href="/contas-a-pagar-receber?aba=receber&status=atrasadas"
          className="text-sm font-medium text-brand-soft hover:underline"
        >
          Ver atrasadas
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-line bg-tint p-3">
          <dt className="text-xs text-faint">Em atraso</dt>
          <dd className={`font-semibold tabular-nums ${d.overdueTotal ? "text-danger" : "text-foreground"}`}>
            {brl(d.overdueTotal)}
          </dd>
        </div>
        <div className="rounded-2xl border border-line bg-tint p-3">
          <dt className="text-xs text-faint">Clientes devendo</dt>
          <dd className="font-semibold tabular-nums text-foreground">{d.overdueCustomers}</dd>
        </div>
        <div className="rounded-2xl border border-line bg-tint p-3">
          <dt className="text-xs text-faint">Atraso médio</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {d.averageDaysLate} {d.averageDaysLate === 1 ? "dia" : "dias"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">Quem mais deve</p>
          {d.worstPayers.length === 0 ? (
            <p className="mt-2 text-sm text-faint">Ninguém em atraso. 🎉</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {d.worstPayers.map((c) => (
                <li key={c.customerId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{c.name}</span>
                    <span className="text-xs text-faint">
                      {c.overdueCount} em atraso · até {c.maxDaysLate} dias
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-danger">{brl(c.overdue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-faint">
            Quem mais comprou (12 meses)
          </p>
          {d.topCustomers.length === 0 ? (
            <p className="mt-2 text-sm text-faint">
              Marque contas a receber como recebidas para montar o ranking.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {d.topCustomers.map((c, i) => (
                <li key={c.customerId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">
                      {i + 1}. {c.name}
                    </span>
                    <span className="text-xs text-faint">
                      {c.paidLateCount > 0
                        ? `${c.paidLateCount} de ${c.paidCount} pagos com atraso`
                        : "Paga em dia"}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-success">{brl(c.received12m)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
