import { CashFlowChart } from "./components/cash-flow-chart";
import { ExpensesByCategory } from "./components/expenses-by-category";
import { KpiCards } from "./components/kpi-cards";
import { NetWorthChart } from "./components/net-worth-chart";
import { PeriodFilter } from "./components/period-filter";
import { ReportsHeader } from "./components/reports-header";

import { getSummaryData } from "./data/summary";
import { getCashFlowData } from "./data/cash-flow";
import { getCategoryExpenses } from "./data/category-expenses";
import { getNetWorthData } from "./data/net-worth";
import { parsePeriod, type ReportSearchParams } from "./data/period";

type Props = {
  // Next 14 entrega um objeto, Next 15 uma Promise: o `await` cobre os dois.
  searchParams?: Promise<ReportSearchParams>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const period = parsePeriod((await searchParams) ?? {});

  const [summary, cashFlow, categoryExpenses, netWorth] =
    await Promise.all([
      getSummaryData(period),
      getCashFlowData(period),
      getCategoryExpenses(period),
      getNetWorthData(),
    ]);

  return (
    <div className="space-y-6">
      <ReportsHeader />

      <PeriodFilter period={period.key} from={period.from} to={period.to} />

      <KpiCards
        income={summary.income}
        expenses={summary.expenses}
        balance={summary.balance}
        netWorth={summary.netWorth}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <CashFlowChart data={cashFlow} />

        <ExpensesByCategory data={categoryExpenses} />
      </div>

      <NetWorthChart data={netWorth} />
    </div>
  );
}
