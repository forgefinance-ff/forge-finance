import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getAccounts } from "@/lib/accounts";
import { getCards, getCardsOverview } from "@/lib/cards";
import { getCategories } from "@/lib/categories";
import { getDashboardData } from "@/lib/dashboard";
import { getGoals } from "@/lib/goals";
import { getBudgets } from "@/lib/budgets";
import { getDueSummary } from "@/lib/payables";
import { todayInBrazil } from "@/lib/dates";
import { DasReminderCard } from "@/components/dashboard/das-reminder-card";
import { BusinessPanelLink } from "@/components/business/business-panel-link";
import { getDasReminder } from "@/lib/mei";
import { getActiveScope } from "@/lib/scope-server";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUIDE_SKIP_COOKIE, getGuideProgress } from "@/lib/guide";

export default async function DashboardPage() {
  const [supabase, user, scope, cookieStore] = await Promise.all([
    createClient(),
    getAuthUser(),
    getActiveScope(),
    cookies(),
  ]);

  // Primeiro login (Pro: WhatsApp não conectado; grátis: sem conta cadastrada): abre o guia, a menos que
  // a pessoa tenha escolhido "Fazer depois". Roda junto com as consultas do painel.
  const checkGuide = !cookieStore.get(GUIDE_SKIP_COOKIE) && user;

  const [dashboard, accounts, categories, goals, cards, dueSummary, dasReminder, cardsOverview, profileResult, guide, budgets] =
    await Promise.all([
      getDashboardData(),
      getAccounts(),
      getCategories(),
      getGoals(),
      getCards(),
      getDueSummary(),
      scope === "business" ? getDasReminder() : Promise.resolve(null),
      getCardsOverview(),
      user
        ? supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      checkGuide ? getGuideProgress(user.id) : Promise.resolve(null),
      getBudgets(),
    ]);

  if (guide && !guide.firstStepDone) redirect("/comecar");

  const profile = profileResult.data as { full_name: string | null } | null;

  const userName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    null;

  return (
    <DashboardOverview
      data={dashboard}
      accounts={accounts}
      categories={categories}
      goals={goals}
      budgets={budgets}
      cards={cards}
      cardsOverview={cardsOverview}
      dueSummary={dueSummary}
      today={todayInBrazil()}
      userName={userName}
      alerts={
        scope === "business" ? (
          <>
            <BusinessPanelLink />
            <DasReminderCard reminder={dasReminder} />
          </>
        ) : null
      }
    />
  );
}
