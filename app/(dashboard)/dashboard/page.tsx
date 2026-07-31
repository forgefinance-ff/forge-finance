import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getDashboardData } from "@/lib/dashboard";

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  return <DashboardOverview data={dashboard} />;
}
