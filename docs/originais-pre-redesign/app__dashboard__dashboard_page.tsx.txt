import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getAccounts } from "@/lib/accounts";
import { getCategories } from "@/lib/categories";
import { getDashboardData } from "@/lib/dashboard";
import { getGoals } from "@/lib/goals";

export default async function DashboardPage() {
  const [dashboard, accounts, categories, goals] = await Promise.all([
    getDashboardData(),
    getAccounts(),
    getCategories(),
    getGoals(),
  ]);

  return (
    <DashboardOverview
      data={dashboard}
      accounts={accounts}
      categories={categories}
      goals={goals}
    />
  );
}
