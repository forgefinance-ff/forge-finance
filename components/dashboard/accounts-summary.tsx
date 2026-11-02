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
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
          <Landmark
            size={22}
            className="text-brand-soft"
          />
        </div>

        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Contas
          </h3>

          <p className="text-sm text-muted-foreground">
            Visão geral das suas contas
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <div className="rounded-2xl border border-line bg-tint p-4">
          <p className="text-sm text-muted-foreground">
            Patrimônio total
          </p>

          <h2 className="mt-2 text-3xl font-bold text-foreground">
            {totalBalance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </h2>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-tint p-4">
          <div className="flex items-center gap-3">
            <Wallet
              size={18}
              className="text-brand-soft"
            />

            <span className="text-text-soft">
              Contas cadastradas
            </span>
          </div>

          <span className="rounded-full bg-violet-500/10 px-3 py-1 text-sm font-semibold text-brand-soft">
            {accountCount}
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 p-4">
          <p className="text-sm leading-6 text-success">
            Todas as contas cadastradas já estão sendo consideradas no cálculo do patrimônio.
          </p>
        </div>
      </div>
    </section>
  );
}