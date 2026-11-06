import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAiStatus } from "@/lib/ai/config";
import { BUSINESS_ONBOARDING_COOKIE } from "@/lib/scope";
import { getActiveScope } from "@/lib/scope-server";

import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { BusinessOnboarding } from "@/components/business-onboarding";
import { SectionTabs } from "@/components/section-tabs";
import { GuideBanner } from "@/components/guide/guide-banner";
import { GUIDE_SKIP_COOKIE, getGuideProgress } from "@/lib/guide";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", session.user.id)
    .maybeSingle();

  const userName =
    profile?.full_name ||
    (session.user.user_metadata?.full_name as string | undefined) ||
    session.user.email?.split("@")[0] ||
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
        .eq("user_id", session.user.id)
        .eq("scope", "business");

      offerBusinessDefaults = (count ?? 0) === 0;
    }
  }

  // Guia de primeiros passos: barra de progresso até concluir (ou "Fazer depois").
  const cookieStore = await cookies();
  const guideSkipped = Boolean(cookieStore.get(GUIDE_SKIP_COOKIE)?.value);
  const guide = await getGuideProgress(session.user.id);

  return (
    <div className="relative isolate min-h-screen">
      <div aria-hidden className="forge-backdrop" />

      <AppSidebar scope={scope} />

      <div className="flex min-h-screen min-w-0 flex-col md:pl-20">
        <SiteHeader
          userName={userName}
          avatarUrl={profile?.avatar_url ?? null}
          aiConfigured={ai.configured}
          scope={scope}
        />

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:pb-8 lg:px-8">
          {!guide.complete && !guideSkipped && <GuideBanner progress={guide} />}
          {offerBusinessDefaults && <BusinessOnboarding />}
          <SectionTabs scope={scope} />
          {children}
        </main>
      </div>

      <MobileNav scope={scope} />
    </div>
  );
}
