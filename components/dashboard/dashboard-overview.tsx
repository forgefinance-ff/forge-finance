import { ArrowUpRight, Plus } from "lucide-react";

import { AccountsSummary } from "@/components/dashboard/accounts-summary";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { FinancialInsights } from "@/components/dashboard/financial-insights";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { Button } from "@/components/ui/button";
import { DashboardData } from "@/lib/dashboard";

type DashboardOverviewProps = {
  data: DashboardData;
};

export function DashboardOverview({
  data,
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
            <p className="text-sm text-slate-400">
              Patrimônio Total
            </p>

            <h2 className="mt-1 text-5xl font-bold text-white">
              {balance}
            </h2>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
              <ArrowUpRight size={16} />
              +12,4% em relação ao mês passado
            </div>
          </div>

          <Button className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
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
            data={data.chartData}
          />
        </div>

        <GoalsCard />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RecentTransactions
            transactions={data.recentTransactions}
          />
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

        <div className="rounded-3xl border border-dashed border-white/10 bg-[#111827] p-6">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 rounded-2xl bg-violet-500/10 p-4">
              <Plus
                className="text-violet-400"
                size={28}
              />
            </div>

            <h3 className="text-lg font-semibold text-white">
              Ações Rápidas
            </h3>

            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-400">
              Este painel receberá atalhos para criar transações, contas,
              cartões, metas e outras ações rápidas nas próximas etapas.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}