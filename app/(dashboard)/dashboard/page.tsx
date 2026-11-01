import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { getAiStatus } from "@/lib/ai/config";
import { getAccounts } from "@/lib/accounts";
import { getCards } from "@/lib/cards";
import { getCategories } from "@/lib/categories";
import { getDashboardData } from "@/lib/dashboard";
import { getGoals } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [dashboard, accounts, categories, goals, cards, userResult] =
    await Promise.all([
      getDashboardData(),
      getAccounts(),
      getCategories(),
      getGoals(),
      getCards(),
      supabase.auth.getUser(),
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
    />
  );
}
