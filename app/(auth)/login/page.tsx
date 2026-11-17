"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title={
        <>
          Que bom te ver <strong>de novo</strong>
        </>
      }
      subtitle="Entre para ver como está o seu dinheiro hoje."
    >
      <LoginForm />
    </AuthShell>
  );
}
