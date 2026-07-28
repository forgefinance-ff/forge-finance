import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          Visão geral da sua vida financeira.
        </p>
      </div>

      <DashboardCards
        totalBalance={dashboard.totalBalance}
        totalIncome={dashboard.totalIncome}
        totalExpense={dashboard.totalExpense}
        accountCount={dashboard.accountCount}
      />

      <DashboardChart
        data={dashboard.chartData}
      />
    </div>
  );
}