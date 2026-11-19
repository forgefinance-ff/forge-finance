import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getAiStatus } from "@/lib/ai/config";
import { BUSINESS_ONBOARDING_COOKIE } from "@/lib/scope";
import { getActiveScope } from "@/lib/scope-server";
import { isAdminEmail } from "@/lib/admin/auth";
import { getSupportUnreadCount } from "@/lib/admin/support";
import { SummaryReady } from "@/components/summary/summary-ready";
import { SUMMARY_SEEN_COOKIE } from "@/lib/summary-cookie";
import { todayInBrazil } from "@/lib/dates";
import { freshSummaryMonth, monthName } from "@/lib/monthly-summary-core";

import { AppSidebar, MobileNav, RAIL_COOKIE, type SidebarPlan } from "@/components/app-sidebar";
import { getUserEntitlement, isOnTrial, isPaidActive } from "@/lib/billing/get-user-plan";
import { planName } from "@/lib/billing/plans";
import { trialDaysLeft } from "@/lib/billing/manual-access";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getNavBadges } from "@/lib/nav-badges";
import { SiteHeader } from "@/components/site-header";
import { BusinessOnboarding } from "@/components/business-onboarding";
import { SectionTabs } from "@/components/section-tabs";
import { GuideBanner } from "@/components/guide/guide-banner";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { SupportBubble } from "@/components/support/support-bubble";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from "@/lib/support";
import { GUIDE_SKIP_COOKIE, getGuideProgress } from "@/lib/guide";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Token verificado (getClaims), não só lido do cookie.
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const userName =
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Usuário";

  const ai = getAiStatus();
  const scope = await getActiveScope();

  // Na 1ª visita ao escopo Empresa (sem categorias de empresa e sem resposta
  // anterior), oferece criar os padrões. Nada é criado sem confirmação.
  let offerBusinessDefaults = false;

  if (scope === "business") {
    const answered = (await cookies()).get(BUSINESS_ONBOARDING_COOKIE)?.value;

    if (!answered) {
      const { count } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("scope", "business");

      offerBusinessDefaults = (count ?? 0) === 0;
    }
  }

  // Guia de primeiros passos: barra de progresso até concluir (ou "Fazer depois").
  const cookieStore = await cookies();
  const guideSkipped = Boolean(cookieStore.get(GUIDE_SKIP_COOKIE)?.value);
  const isAdmin = isAdminEmail(user.email);
  const [guide, badges, supportUnread, entitlement, adminSupportUnread] = await Promise.all([
    getGuideProgress(user.id),
    getNavBadges(),
    supabase.rpc("ff_support_unread").then(({ data }) => Number(data ?? 0)),
    getUserEntitlement(user.id).catch(() => null),
    // Só admins: conversas de suporte esperando resposta (número no escudo).
    isAdmin ? getSupportUnreadCount().catch(() => 0) : Promise.resolve(0),
  ]);
  // Sem dados do plano, a barra não mostra o cartão (melhor nada que errado).
  const plan: SidebarPlan | undefined = !entitlement
    ? undefined
    : isPaidActive(entitlement)
      ? { kind: "paid", name: planName(entitlement.planId) }
      : isOnTrial(entitlement)
        ? { kind: "trial", daysLeft: trialDaysLeft(entitlement.trialEndsAt) }
        : { kind: "free" };
  const railOpen = cookieStore.get(RAIL_COOKIE)?.value !== "closed";

  // Resumo do mês: aviso uma vez no último dia do mês (ou nos 3 primeiros do seguinte).
  const summaryMonth = freshSummaryMonth(todayInBrazil());
  const showSummary = Boolean(summaryMonth) && cookieStore.get(SUMMARY_SEEN_COOKIE)?.value !== summaryMonth;

  return (
    <div className="relative isolate min-h-screen">
      <div aria-hidden className="forge-backdrop" />

      <AppSidebar
        scope={scope}
        badges={badges}
        initialOpen={railOpen}
        userName={userName}
        avatarUrl={profile?.avatar_url ?? null}
        plan={plan}
      />

      <div className="forge-shell flex min-h-screen min-w-0 flex-col">
        <SiteHeader
          userName={userName}
          avatarUrl={profile?.avatar_url ?? null}
          aiConfigured={ai.configured}
          scope={scope}
          isAdmin={isAdmin}
          adminSupportUnread={adminSupportUnread}
        />

        <main className="mx-auto w-full min-w-0 max-w-[1320px] flex-1 px-4 pb-24 pt-4 md:pb-10 lg:px-8">
          {!guide.complete && !guideSkipped && <GuideBanner progress={guide} />}
          {offerBusinessDefaults && <BusinessOnboarding />}
          <Breadcrumbs scope={scope} />
          <SectionTabs scope={scope} badges={badges} />
          {children}
        </main>
      </div>

      <MobileNav scope={scope} badges={badges} />
      {showSummary && summaryMonth && <SummaryReady month={summaryMonth} monthName={monthName(summaryMonth)} />}
      <InstallAppPrompt />
      <SupportBubble email={SUPPORT_EMAIL} whatsapp={SUPPORT_WHATSAPP} initialUnread={supportUnread} />
    </div>
  );
}
