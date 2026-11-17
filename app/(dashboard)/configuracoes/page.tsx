import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ProfileCard } from "./components/profile-card";
import { ChangePasswordForm } from "./components/change-password-form";
import { LogoutButton } from "./components/logout-button";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { createClient, getAuthUser } from "@/lib/supabase/server";

import { DataPrivacyCard } from "./components/data-privacy-card";
import { NotificationsCard } from "./components/notifications-card";

export default async function SettingsPage() {
  const user = await getAuthUser();
  const supabase = await createClient();
  const [prefsRes, linkRes] = user
    ? await Promise.all([
        supabase.from("notification_prefs").select("weekly_summary, monthly_summary, budget_alerts").eq("user_id", user.id).maybeSingle(),
        supabase.from("whatsapp_links").select("user_id").eq("user_id", user.id).maybeSingle(),
      ])
    : [{ data: null }, { data: null }];
  const prefs = {
    weekly_summary: Boolean(prefsRes.data?.weekly_summary ?? false),
    monthly_summary: Boolean(prefsRes.data?.monthly_summary ?? true),
    budget_alerts: Boolean(prefsRes.data?.budget_alerts ?? true),
  };

  return (
    <div className="space-y-8">
      <div className="pt-2 pb-2">

        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          Configurações
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Gerencie sua conta e preferências do <span className="brand-name">Forge Finance</span>.
        </p>
      </div>

      <ProfileCard />

      <InstallAppCard />

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <ChangePasswordForm />

          <div className="border-t border-line pt-6">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>

      <NotificationsCard initial={prefs} hasWhatsApp={!!linkRes.data} />

      <DataPrivacyCard />
    </div>
  );
}