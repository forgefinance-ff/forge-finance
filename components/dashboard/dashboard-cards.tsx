import {
  ArrowDownRight,
  ArrowUpRight,
  Landmark,
  LineChart,
  WalletCards,
} from "lucide-react";

import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type DashboardCardsProps = {
  totalBalance: number;
  accountsTotal: number;
  investmentsTotal: number;
  investedAmount: number;
  monthIncome: number;
  monthExpense: number;
  previousMonthExpense: number;
  totalIncome: number;
  totalExpense: number;
};

type Badge = { text: string; tone: "up" | "down" | "neutral" } | null;

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1).replace(".", ",")}%`;
}

export function DashboardCards({
  totalBalance,
  accountsTotal,
  investmentsTotal,
  investedAmount,
  monthIncome,
  monthExpense,
  previousMonthExpense,
  totalIncome,
  totalExpense,
}: DashboardCardsProps) {
  const expenseChange = percentChange(monthExpense, previousMonthExpense);
  const yieldChange = percentChange(investmentsTotal, investedAmount);

  const cards: {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    badge: Badge;
  }[] = [
    {
      title: "Patrimônio total",
      value: formatCurrency(totalBalance),
      subtitle: `Contas ${formatCurrency(accountsTotal)} + investimentos`,
      icon: WalletCards,
      iconClass: "bg-brand/20 text-brand-soft",
      badge: null,
    },
    {
      title: "Receitas do mês",
      value: formatCurrency(monthIncome),
      subtitle: `Histórico: ${formatCurrency(totalIncome)}`,
      icon: ArrowUpRight,
      iconClass: "bg-emerald-500/15 text-success",
      badge: null,
    },
    {
      title: "Despesas do mês",
      value: formatCurrency(monthExpense),
      subtitle: `Histórico: ${formatCurrency(totalExpense)}`,
      icon: ArrowDownRight,
      iconClass: "bg-rose-500/15 text-danger",
      badge:
        expenseChange === null
          ? null
          : {
              text: `${formatPercent(expenseChange)} vs mês anterior`,
              // Despesa subindo é ruim; caindo é bom.
              tone: expenseChange > 0 ? "down" : "up",
            },
    },
    {
      title: "Investimentos",
      value: formatCurrency(investmentsTotal),
      subtitle:
        investedAmount > 0
          ? `Aportado: ${formatCurrency(investedAmount)}`
          : "Nenhum aporte registrado",
      icon: investmentsTotal > 0 ? LineChart : Landmark,
      iconClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300",
      badge:
        yieldChange === null
          ? null
          : {
              text: `${formatPercent(yieldChange)} sobre o aportado`,
              tone: yieldChange >= 0 ? "up" : "down",
            },
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.title}
            className="forge-panel group relative overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-bright/30 hover:shadow-[0_18px_40px_-18px_rgba(124,58,237,0.45)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  card.iconClass
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </div>

              {card.badge && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    card.badge.tone === "up" && "bg-emerald-500/15 text-success",
                    card.badge.tone === "down" && "bg-rose-500/15 text-danger",
                    card.badge.tone === "neutral" && "bg-tint-strong text-text-soft"
                  )}
                >
                  {card.badge.text}
                </span>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">{card.title}</p>
            <h3 className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-foreground">
              {card.value}
            </h3>
            <p className="mt-1 truncate text-[11px] text-faint">
              {card.subtitle}
            </p>
          </article>
        );
      })}
    </section>
  );
}
