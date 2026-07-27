import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";

export default function DashboardPage() {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Dashboard
        </h1>

        <p className="mt-2 text-slate-400">
          Visão geral da sua vida financeira.
        </p>
      </div>

      <DashboardCards />

      <DashboardChart />
    </div>
  );
}