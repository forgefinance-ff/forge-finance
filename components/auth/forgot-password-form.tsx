"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircleIcon, ArrowRightIcon, Loader2Icon, MailCheckIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "./auth-errors";

/** Pede o link de redefinição de senha por e-mail. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha`,
    });

    setLoading(false);

    // Não dizemos se o e-mail existe ou não (evita descobrir quem tem conta).
    if (error && !/user not found/i.test(error.message)) {
      setError(authErrorMessage(error.message));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-5">
        <p role="status" className="forge-auth-alert forge-auth-alert--info">
          <MailCheckIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Se existir uma conta com {email}, você vai receber um link para criar uma senha nova. Confira também o
          spam. O link vale por 1 hora.
        </p>
        <Link href="/login" className="forge-auth-button">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p role="alert" className="forge-auth-alert forge-auth-alert--error">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div>
        <label htmlFor="forgot-email" className="forge-auth-label">
          E-mail da sua conta
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <button type="submit" disabled={loading} className="forge-auth-button">
        {loading ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
            Enviando…
          </>
        ) : (
          <>
            Enviar link
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <p className="forge-auth-note text-center">
        Lembrou?{" "}
        <Link href="/login" className="forge-auth-link">
          Entrar
        </Link>
      </p>
    </form>
  );
}
