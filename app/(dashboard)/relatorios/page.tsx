import { CategoryBubbles } from "./components/category-bubbles";
import { KpiCards } from "./components/kpi-cards";
import { NetWorthCandles } from "./components/net-worth-candles";
import { PeriodFilter } from "./components/period-filter";
import { ReportsHeader } from "./components/reports-header";

import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { WealthDistribution } from "@/components/dashboard/wealth-distribution";
import { getAccounts } from "@/lib/accounts";
import { getDashboardData } from "@/lib/dashboard";

import { getSummaryData } from "./data/summary";
import { getCategoryExpenses } from "./data/category-expenses";
import { getNetWorthDaily } from "./data/net-worth";
import { parsePeriod, type ReportSearchParams } from "./data/period";

type Props = {
  // Next 14 entrega um objeto, Next 15 uma Promise: o `await` cobre os dois.
  searchParams?: Promise<ReportSearchParams>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const period = parsePeriod((await searchParams) ?? {});

  const [summary, categoryExpenses, netWorthDays, dashboard, accounts] =
    await Promise.all([
      getSummaryData(period),
      getCategoryExpenses(period),
      getNetWorthDaily(),
      getDashboardData(),
      getAccounts(),
    ]);

  const wealthSlices = [
    ...accounts
      .filter((a) => Number(a.current_balance) > 0)
      .map((a) => ({ name: a.name, value: Number(a.current_balance) })),
    { name: "Investimentos", value: dashboard.investmentsTotal },
  ];
  const negativeAccountsTotal = accounts
    .filter((a) => Number(a.current_balance) < 0)
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  return (
    <div className="space-y-6">
      <ReportsHeader />

      <PeriodFilter period={period.key} from={period.from} to={period.to} />

      <KpiCards
        income={summary.income}
        expenses={summary.expenses}
        balance={summary.balance}
        netWorth={summary.netWorth}
        upcomingExpenses={summary.upcomingExpenses}
      />

      <CategoryBubbles data={categoryExpenses} />

      <NetWorthCandles days={netWorthDays} />

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5">
          <WealthDistribution slices={wealthSlices} negativeAccountsTotal={negativeAccountsTotal} />
        </div>
        <div className="min-w-0 xl:col-span-7">
          <ActivityHeatmap cells={dashboard.analytics.heatmap} weeks={dashboard.analytics.heatmapWeeks} />
        </div>
      </div>
    </div>
  );
}
