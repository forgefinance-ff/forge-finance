import { getReportSummary } from "@/lib/reports";

export async function getSummaryData() {
  const summary = await getReportSummary();

  return {
    income: summary.income,
    expenses: summary.expenses,
    balance: summary.balance,
    netWorth: summary.netWorth,
  };
}