"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  TrendingUp,
} from "lucide-react";

type Props = {
  transactions: any[];
};

export function TransactionsSummary({ transactions }: Props) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) => total + Number(transaction.amount),
      0
    );

  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) => total + Number(transaction.amount),
      0
    );

  const balance = income - expense;

  const cards = [
    {
      title: "Receitas",
      value: income,
      icon: ArrowUpCircle,
      color:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Despesas",
      value: expense,
      icon: ArrowDownCircle,
      color:
        "bg-red-500/10 text-red-400 border-red-500/20",
    },
    {
      title: "Saldo",
      value: balance,
      icon: Wallet,
      color:
        "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      title: "Transações",
      value: transactions.length,
      icon: TrendingUp,
      color:
        "bg-violet-500/10 text-violet-400 border-violet-500/20",
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
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">
                {card.title}
              </span>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.color}`}
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