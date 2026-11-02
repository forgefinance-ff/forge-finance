import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { ForgeIntelligence } from "@/components/dashboard/forge-intelligence";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { NewTransactionTrigger } from "@/components/dashboard/new-transaction-trigger";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { WealthDistribution } from "@/components/dashboard/wealth-distribution";
import { createTransaction } from "@/app/actions/transactions";
import type { Account } from "@/lib/accounts";
import type { Card } from "@/lib/cards";
import type { Category } from "@/lib/categories";
import { DashboardData } from "@/lib/dashboard";
import type { Goal } from "@/lib/goals";

type DashboardOverviewProps = {
  data: DashboardData;
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  cards: Card[];
  userName: string | null;
  aiConfigured: boolean;
};

function greeting() {
  // Horário de Brasília, independente do fuso do servidor.
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardOverview({
  data,
  accounts,
  categories,
  goals,
  cards,
  userName,
  aiConfigured,
}: DashboardOverviewProps) {
  const firstName = userName?.split(" ")[0];

  const positiveAccounts = accounts.filter((a) => Number(a.current_balance) > 0);
  const negativeAccountsTotal = accounts
    .filter((a) => Number(a.current_balance) < 0)
    .reduce((acc, a) => acc + Number(a.current_balance), 0);

  const wealthSlices = [
    ...positiveAccounts.map((a) => ({
      name: a.name,
      value: Number(a.current_balance),
    })),
    { name: "Investimentos", value: data.investmentsTotal },
  ];

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ""} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suas finanças em um só lugar, com dados em tempo real.
          </p>
        </div>

        <NewTransactionTrigger
          action={createTransaction}
          accounts={accounts}
          categories={categories}
          label="Registrar transação"
          className="h-11 rounded-full bg-gradient-to-r from-brand to-brand-indigo px-5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(124,58,237,0.45)] transition hover:brightness-110"
        />
      </header>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 space-y-4 xl:col-span-9">
          <DashboardCards
            totalBalance={data.totalBalance}
            accountsTotal={data.accountsTotal}
            investmentsTotal={data.investmentsTotal}
            investedAmount={data.investedAmount}
            monthIncome={data.analytics.monthIncome}
            monthExpense={data.analytics.monthExpense}
            previousMonthExpense={data.analytics.previousMonthExpense}
            totalIncome={data.totalIncome}
            totalExpense={data.totalExpense}
          />

          <DashboardChart
            chart7d={data.chart7d}
            chart30d={data.chart30d}
            chart12m={data.chart12m}
            totalBalance={data.totalBalance}
          />
        </div>

        <div className="min-w-0 space-y-4 xl:col-span-3">
          <ForgeIntelligence
            analytics={data.analytics}
            goals={goals}
            cards={cards}
            hasData={data.hasData}
            aiConfigured={aiConfigured}
          />
          <ActivityHeatmap
            cells={data.analytics.heatmap}
            weeks={data.analytics.heatmapWeeks}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-4">
          <ExpenseBreakdown
            slices={data.analytics.expenseByCategory}
            total={data.analytics.monthExpense}
          />
        </div>

        <div className="min-w-0 xl:col-span-5">
          <WealthDistribution
            slices={wealthSlices}
            negativeAccountsTotal={negativeAccountsTotal}
          />
        </div>

        <div className="min-w-0 lg:col-span-2 xl:col-span-3">
          <GoalsCard goals={goals} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-9">
          <RecentTransactions transactions={data.recentTransactions} />
        </div>
        <div className="min-w-0 xl:col-span-3">
          <QuickActionsCard accounts={accounts} categories={categories} />
        </div>
      </div>
    </section>
  );
}
