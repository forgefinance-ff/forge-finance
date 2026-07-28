import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ProfileCard } from "./components/profile-card";
import { ChangePasswordForm } from "./components/change-password-form";
import { LogoutButton } from "./components/logout-button";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Configurações
        </h1>

        <p className="text-muted-foreground">
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

          <div className="border-t pt-6">
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