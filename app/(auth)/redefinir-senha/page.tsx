import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata = { title: "Nova senha · Forge Finance" };

export default async function ResetPasswordPage() {
  const user = await getAuthUser();

  return (
    <AuthShell title="Crie uma senha nova." subtitle="Depois disso você já entra direto no app.">
      <ResetPasswordForm hasSession={!!user} />
    </AuthShell>
  );
}
