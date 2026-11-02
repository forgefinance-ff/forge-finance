import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getAiStatus } from "@/lib/ai/config";
import { getAccounts } from "@/lib/accounts";
import { getCards } from "@/lib/cards";
import { getCategories } from "@/lib/categories";
import { getDashboardData } from "@/lib/dashboard";
import { getGoals } from "@/lib/goals";
import { getDueSummary } from "@/lib/payables";
import { todayInBrazil } from "@/lib/dates";
import { DueSoonCard } from "@/components/dashboard/due-soon-card";
import { DasReminderCard } from "@/components/dashboard/das-reminder-card";
import { getDasReminder } from "@/lib/mei";
import { getActiveScope } from "@/lib/scope-server";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const scope = await getActiveScope();

  const [dashboard, accounts, categories, goals, cards, userResult, dueSummary, dasReminder] =
    await Promise.all([
      getDashboardData(),
      getAccounts(),
      getCategories(),
      getGoals(),
      getCards(),
      supabase.auth.getUser(),
      getDueSummary(),
      scope === "business" ? getDasReminder() : Promise.resolve(null),
    ]);

  const user = userResult.data.user;

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

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
      cards={cards}
      userName={userName}
      aiConfigured={getAiStatus().configured}
      alerts={
        <>
          <DasReminderCard reminder={dasReminder} />
          <DueSoonCard summary={dueSummary} today={todayInBrazil()} />
        </>
      }
    />
  );
}
