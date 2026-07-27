import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  WalletCards,
} from "lucide-react";

const cards = [
  {
    title: "Saldo Total",
    value: "R$ 0,00",
    icon: WalletCards,
    gradient: "from-violet-600 to-fuchsia-500",
  },
  {
    title: "Receitas",
    value: "R$ 0,00",
    icon: ArrowUpRight,
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    title: "Despesas",
    value: "R$ 0,00",
    icon: ArrowDownRight,
    gradient: "from-pink-500 to-red-500",
  },
  {
    title: "Contas",
    value: "0",
    icon: Landmark,
    gradient: "from-indigo-600 to-cyan-500",
  },
];

export function DashboardCards() {
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
              <span className="text-slate-400">
                {card.title}
              </span>

              <div
                className={`rounded-xl bg-gradient-to-r ${card.gradient} p-3`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>

            <h2 className="mt-6 text-4xl font-bold text-white">
              {card.value}
            </h2>
          </div>
        );
      })}
    </section>
  );
}