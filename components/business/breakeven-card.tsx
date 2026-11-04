import type { Breakeven, DreMonth } from "@/lib/business-calc";
import { cn } from "@/lib/utils";

import { brl, pct } from "./format";

export function BreakevenCard({ breakeven, current }: { breakeven: Breakeven; current: DreMonth }) {
  const needed = breakeven.revenueNeeded;
  const progress = needed ? Math.min((current.revenue / needed) * 100, 100) : 0;
  const missing = needed ? Math.max(needed - current.revenue, 0) : null;

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold text-foreground">Ponto de equilíbrio</h2>
      <p className="text-sm text-muted-foreground">
        Quanto a empresa precisa faturar por mês para não ter prejuízo.
      </p>

      {needed === null ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-4 text-sm text-muted-foreground">
          Lance faturamento e despesas (com as categorias classificadas) para calcular.
        </p>
      ) : (
        <>
          <p className="mt-4 text-3xl font-bold tabular-nums text-foreground">{brl(needed)}</p>
          <p className="text-sm text-muted-foreground">por mês</p>

          <div
            role="progressbar"
            aria-label="Faturamento do mês em relação ao ponto de equilíbrio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="mt-4 h-3 overflow-hidden rounded-full bg-tint-strong"
          >
            <div
              className={cn(
                "h-full rounded-full",
                progress >= 100 ? "bg-success" : "bg-gradient-to-r from-brand to-brand-indigo"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={cn("mt-2 text-sm", missing ? "text-warning" : "text-success")}>
            {missing
              ? `Faltam ${brl(missing)} de faturamento este mês para empatar.`
              : "Este mês o faturamento já cobriu os custos."}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-line bg-tint p-3">
              <dt className="text-xs text-faint">Custos fixos + pró-labore</dt>
              <dd className="font-semibold tabular-nums text-foreground">{brl(breakeven.fixedCosts)}/mês</dd>
            </div>
            <div className="rounded-2xl border border-line bg-tint p-3">
              <dt className="text-xs text-faint">Impostos + variáveis</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {pct(breakeven.variableRate * 100)} das vendas
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-faint">
            Conta: {brl(breakeven.fixedCosts)} ÷ (1 − {pct(breakeven.variableRate * 100)}). Média de{" "}
            {breakeven.basedOnMonths} {breakeven.basedOnMonths === 1 ? "mês" : "meses"}.
          </p>
        </>
      )}
    </section>
  );
}
