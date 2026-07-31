import { Landmark, Wallet } from "lucide-react";

type AccountsSummaryProps = {
  totalBalance: number;
  accountCount: number;
};

export function AccountsSummary({
  totalBalance,
  accountCount,
}: AccountsSummaryProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
          <Landmark
            size={22}
            className="text-violet-400"
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white">
            Contas
          </h3>

          <p className="text-sm text-slate-400">
            Visão geral das suas contas
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <p className="text-sm text-slate-400">
            Patrimônio total
          </p>

          <h2 className="mt-2 text-3xl font-bold text-white">
            {totalBalance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </h2>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <Wallet
              size={18}
              className="text-violet-400"
            />

            <span className="text-slate-300">
              Contas cadastradas
            </span>
          </div>

          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-sm font-semibold text-violet-300">
            {accountCount}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
          <p className="text-sm leading-6 text-emerald-300">
            Todas as contas cadastradas já estão sendo consideradas no cálculo do patrimônio.
          </p>
        </div>
      </div>
    </section>
  );
}