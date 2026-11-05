"use client";
import type { getTransactions } from "@/lib/transactions";

import { CARD_PAYMENT_KIND, countsAsResult } from "@/lib/movement-kinds";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";

type Props = {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
};

export function TransactionsSummary({ transactions }: Props) {
  // Só receitas e despesas de verdade entram no resultado; aportes,
  // empréstimos e reembolsos aparecem à parte.
  const regular = transactions.filter((transaction) => countsAsResult(transaction.kind));
  // Pagamento de fatura não entra em nenhum dos cards: as compras já contaram.
  const others = transactions.filter(
    (transaction) =>
      !countsAsResult(transaction.kind) && transaction.kind !== CARD_PAYMENT_KIND
  );

  const sum = (list: typeof transactions, type: "income" | "expense") =>
    list
      .filter((transaction) => transaction.type === type)
      .reduce((total, transaction) => total + Number(transaction.amount), 0);

  const income = sum(regular, "income");
  const expense = sum(regular, "expense");
  const balance = income - expense;
  const othersNet = sum(others, "income") - sum(others, "expense");

  const cards = [
    {
      title: "Receitas",
      value: income,
      icon: ArrowUpCircle,
      iconColor: "bg-emerald-500/15 text-success",
    },
    {
      title: "Despesas",
      value: expense,
      icon: ArrowDownCircle,
      iconColor: "bg-rose-500/15 text-danger",
    },
    {
      title: "Resultado",
      value: balance,
      icon: Wallet,
      iconColor: "bg-violet-500/15 text-brand-soft",
    },
    {
      title: "Aportes, empréstimos e reembolsos",
      value: othersNet,
      icon: TrendingUp,
      iconColor: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
    },
  ];

  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.title}
            className="rounded-[22px] border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-violet-500/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.title}</span>

              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.iconColor}`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {card.value.toLocaleString("pt-BR", {
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
