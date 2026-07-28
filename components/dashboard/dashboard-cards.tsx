import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
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
      icon: WalletCards,
      gradient: "from-violet-600 to-fuchsia-500",
    },
    {
      title: "Receitas",
      value: formatCurrency(totalIncome),
      icon: ArrowUpRight,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "Despesas",
      value: formatCurrency(totalExpense),
      icon: ArrowDownRight,
      gradient: "from-rose-500 to-red-600",
    },
    {
      title: "Contas",
      value: accountCount.toString(),
      icon: Landmark,
      gradient: "from-cyan-500 to-blue-600",
    },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-3xl border border-white/10 bg-[#111827] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-[0_0_35px_rgba(124,58,237,.25)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                {card.title}
              </span>

              <div
                className={`rounded-xl bg-gradient-to-r ${card.gradient} p-3`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>

            <h2 className="mt-6 text-3xl font-bold text-white">
              {card.value}
            </h2>
          </div>
        );
      })}
    </section>
  );
}