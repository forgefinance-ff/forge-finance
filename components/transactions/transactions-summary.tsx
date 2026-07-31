"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Props = {
  transactions: any[];
};

export function TransactionsSummary({ transactions }: Props) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const balance = income - expense;

  const cards = [
    {
      title: "Receitas",
      value: income,
      icon: ArrowUpCircle,
      iconColor: "bg-emerald-500/15 text-emerald-400",
    },
    {
      title: "Despesas",
      value: expense,
      icon: ArrowDownCircle,
      iconColor: "bg-rose-500/15 text-rose-400",
    },
    {
      title: "Saldo",
      value: balance,
      icon: Wallet,
      iconColor: "bg-violet-500/15 text-violet-400",
    },
    {
      title: "Transações",
      value: transactions.length,
      icon: TrendingUp,
      iconColor: "bg-cyan-500/15 text-cyan-400",
      isCount: true,
    },
  ];

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-3xl border border-white/10 bg-[#111827] p-6 transition hover:-translate-y-1 hover:border-violet-500/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{card.title}</span>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconColor}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-3xl font-bold tracking-tight text-white">
                {card.isCount
                  ? card.value
                  : card.value.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
