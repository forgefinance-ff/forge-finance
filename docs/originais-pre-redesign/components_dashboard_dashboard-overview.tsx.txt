import { ArrowUpRight } from "lucide-react";

import { AccountsSummary } from "@/components/dashboard/accounts-summary";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { FinancialInsights } from "@/components/dashboard/financial-insights";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { NewTransactionTrigger } from "@/components/dashboard/new-transaction-trigger";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { createTransaction } from "@/app/actions/transactions";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";
import { DashboardData } from "@/lib/dashboard";
import type { Goal } from "@/lib/goals";

type DashboardOverviewProps = {
  data: DashboardData;
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
};

export function DashboardOverview({
  data,
  accounts,
  categories,
  goals,
}: DashboardOverviewProps) {
  const balance = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(data.totalBalance);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-[#111827] p-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-sm font-medium text-slate-400">
            Bem-vindo de volta 👋
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
            Dashboard Financeiro
          </h1>

          <p className="mt-3 max-w-xl text-slate-400">
            Acompanhe receitas, despesas, patrimônio e a evolução das suas
            finanças em tempo real.
          </p>
        </div>

        <div className="flex flex-col items-start gap-5 lg:items-end">
          <div>
            <p className="text-sm text-slate-400">Patrimônio Total</p>

            <h2 className="mt-1 text-5xl font-bold text-white">{balance}</h2>

            {data.hasData && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
                <ArrowUpRight size={16} />
                Receitas superam despesas no período
              </div>
            )}
          </div>

          <NewTransactionTrigger
            action={createTransaction}
            accounts={accounts}
            categories={categories}
          />
        </div>
      </header>

      <DashboardCards
        totalBalance={data.totalBalance}
        totalIncome={data.totalIncome}
        totalExpense={data.totalExpense}
        accountCount={data.accountCount}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DashboardChart
            chart7d={data.chart7d}
            chart30d={data.chart30d}
            chart12m={data.chart12m}
          />
        </div>

        <GoalsCard goals={goals} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentTransactions transactions={data.recentTransactions} />
        </div>

        <AccountsSummary
          totalBalance={data.totalBalance}
          accountCount={data.accountCount}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FinancialInsights
            totalIncome={data.totalIncome}
            totalExpense={data.totalExpense}
          />
        </div>

        <QuickActionsCard accounts={accounts} categories={categories} />
      </div>
    </section>
  );
}
