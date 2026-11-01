import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAiStatus } from "@/lib/ai/config";

import { AppSidebar, MobileNav } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";

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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />

      <div className="flex min-h-screen min-w-0 flex-col md:pl-20">
        <SiteHeader
          userName={userName}
          avatarUrl={profile?.avatar_url ?? null}
          aiConfigured={ai.configured}
        />

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:pb-8 lg:px-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
