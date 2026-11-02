"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell subtitle="Faça login para continuar.">
      <LoginForm />
    </AuthShell>
  );
}
