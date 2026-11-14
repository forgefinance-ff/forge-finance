import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Esqueci minha senha · Forge Finance" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Esqueceu a senha?" subtitle="Digite seu e-mail e mandamos um link para você criar uma nova.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
