import {
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  PiggyBank,
  TrendingUp,
} from "lucide-react";

type FinancialInsightsProps = {
  totalIncome: number;
  totalExpense: number;
};

export function FinancialInsights({
  totalIncome,
  totalExpense,
}: FinancialInsightsProps) {
  const balance = totalIncome - totalExpense;

  const savingsRate =
    totalIncome > 0
      ? (balance / totalIncome) * 100
      : 0;

  const positive = balance >= 0;

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
          <TrendingUp
            className="text-brand-soft"
            size={22}
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Insights Financeiros
          </h3>

          <p className="text-sm text-muted-foreground">
            Indicadores rápidos do período
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-line bg-tint p-4">
          <div className="flex items-center gap-3">
            <ArrowUp
              className="text-success"
              size={18}
            />

            <span className="text-text-soft">
              Receitas
            </span>
          </div>

          <span className="font-semibold text-success">
            {totalIncome.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-tint p-4">
          <div className="flex items-center gap-3">
            <ArrowDown
              className="text-danger"
              size={18}
            />

            <span className="text-text-soft">
              Despesas
            </span>
          </div>

          <span className="font-semibold text-danger">
            {totalExpense.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-tint p-4">
          <div className="flex items-center gap-3">
            <BadgeDollarSign
              className="text-brand-soft"
              size={18}
            />

            <span className="text-text-soft">
              Resultado
            </span>
          </div>

          <span
            className={`font-semibold ${
              positive
                ? "text-success"
                : "text-danger"
            }`}
          >
            {balance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <PiggyBank
              size={18}
              className="text-success"
            />

            <span className="font-medium text-success">
              Taxa de economia
            </span>
          </div>

          <div className="mb-3 h-2 overflow-hidden rounded-full bg-tint-strong">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{
                width: `${Math.min(
                  Math.max(savingsRate, 0),
                  100
                )}%`,
              }}
            />
          </div>

          <p className="text-sm text-success">
            {savingsRate.toFixed(1)}% da sua receita foi preservada.
          </p>
        </div>
      </div>
    </section>
  );
}