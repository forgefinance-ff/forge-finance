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
    <section className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
          <TrendingUp
            className="text-violet-400"
            size={22}
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white">
            Insights Financeiros
          </h3>

          <p className="text-sm text-slate-400">
            Indicadores rápidos do período
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <ArrowUp
              className="text-emerald-400"
              size={18}
            />

            <span className="text-slate-300">
              Receitas
            </span>
          </div>

          <span className="font-semibold text-emerald-400">
            {totalIncome.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <ArrowDown
              className="text-rose-400"
              size={18}
            />

            <span className="text-slate-300">
              Despesas
            </span>
          </div>

          <span className="font-semibold text-rose-400">
            {totalExpense.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <BadgeDollarSign
              className="text-violet-400"
              size={18}
            />

            <span className="text-slate-300">
              Resultado
            </span>
          </div>

          <span
            className={`font-semibold ${
              positive
                ? "text-emerald-400"
                : "text-rose-400"
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
              className="text-emerald-400"
            />

            <span className="font-medium text-emerald-300">
              Taxa de economia
            </span>
          </div>

          <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/10">
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

          <p className="text-sm text-emerald-300">
            {savingsRate.toFixed(1)}% da sua receita foi preservada.
          </p>
        </div>
      </div>
    </section>
  );
}