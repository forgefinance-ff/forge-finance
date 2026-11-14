import type { NavBadges } from "@/components/app-sidebar";
import { getDueSummary } from "@/lib/payables";
import { getGoals } from "@/lib/goals";
import { todayInBrazil } from "@/lib/dates";

/** Avisos do menu: contas vencidas ou vencendo em 7 dias e metas com prazo vencido. */
export async function getNavBadges(): Promise<NavBadges> {
  const [due, goals] = await Promise.all([
    getDueSummary().catch(() => null),
    getGoals().catch(() => []),
  ]);

  const badges: NavBadges = {};

  if (due) {
    const soon = due.upcoming.length;
    const count = due.overdueCount + soon;
    if (count > 0) {
      const parts = [];
      if (due.overdueCount > 0) parts.push(`${due.overdueCount} vencida${due.overdueCount > 1 ? "s" : ""}`);
      if (soon > 0) parts.push(`${soon} vence${soon > 1 ? "m" : ""} em 7 dias`);
      badges["/contas-a-pagar-receber"] = {
        count,
        tone: due.overdueCount > 0 ? "danger" : "brand",
        label: `Contas: ${parts.join(", ")}`,
      };
    }
  }

  const today = todayInBrazil();
  const late = goals.filter(
    (goal) => goal.deadline && goal.deadline < today && goal.current_amount < goal.target_amount
  ).length;
  if (late > 0) {
    badges["/metas"] = {
      count: late,
      tone: "danger",
      label: `${late} meta${late > 1 ? "s" : ""} com prazo vencido`,
    };
  }

  return badges;
}
