"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function CadastroPage() {
  return (
    <AuthShell subtitle="Crie sua conta para começar.">
      <RegisterForm />
    </AuthShell>
  );
}
