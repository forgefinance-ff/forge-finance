import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type DashboardCardsProps = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  accountCount: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function DashboardCards({
  totalBalance,
  totalIncome,
  totalExpense,
  accountCount,
}: DashboardCardsProps) {
  const cards = [
    {
      title: "Saldo Total",
      value: formatCurrency(totalBalance),
      change: "+8,2%",
      subtitle: "Patrimônio atualizado",
      icon: WalletCards,
      iconColor: "bg-violet-500/15 text-violet-400",
    },
    {
      title: "Receitas",
      value: formatCurrency(totalIncome),
      change: "+14,8%",
      subtitle: "Últimos 30 dias",
      icon: ArrowUpRight,
      iconColor: "bg-emerald-500/15 text-emerald-400",
    },
    {
      title: "Despesas",
      value: formatCurrency(totalExpense),
      change: "-3,6%",
      subtitle: "Controle de gastos",
      icon: ArrowDownRight,
      iconColor: "bg-rose-500/15 text-rose-400",
    },
    {
      title: "Contas",
      value: accountCount.toString(),
      change: "100%",
      subtitle: "Sincronizadas",
      icon: Landmark,
      iconColor: "bg-cyan-500/15 text-cyan-400",
    },
  ];

  return (
    <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#111827] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-[0_20px_45px_rgba(124,58,237,.18)]"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  {card.title}
                </p>

                <h3 className="mt-3 text-3xl font-bold tracking-tight text-white">
                  {card.value}
                </h3>
              </div>

              <div className={`rounded-2xl p-3 ${card.iconColor}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">
                  {card.subtitle}
                </p>

                <span className="mt-1 block text-xs text-slate-500">
                  Comparado ao período anterior
                </span>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                {card.change}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}