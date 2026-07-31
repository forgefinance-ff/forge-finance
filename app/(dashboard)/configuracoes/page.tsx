import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ProfileCard } from "./components/profile-card";
import { ChangePasswordForm } from "./components/change-password-form";
import { LogoutButton } from "./components/logout-button";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-[#111827] p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Configurações
        </h1>

        <p className="mt-2 max-w-xl text-slate-400">
          Gerencie sua conta e preferências do Forge Finance.
        </p>
      </div>

      <ProfileCard />

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <ChangePasswordForm />

          <div className="border-t border-white/10 pt-6">
            <LogoutButton />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências</CardTitle>
        </CardHeader>

        <CardContent>
          Tema, moeda e opções do sistema.
        </CardContent>
      </Card>
    </div>
  );
}