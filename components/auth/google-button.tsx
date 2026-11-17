"use client";

import { useState } from "react";

import { GoogleIcon } from "@/components/ui/sign-in";
import { createClient } from "@/lib/supabase/client";

import { authErrorMessage } from "./auth-errors";

/** Só aparece com NEXT_PUBLIC_GOOGLE_AUTH=true (precisa do provedor Google ligado no Supabase). */
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "true";

export function GoogleButton({ next, label = "Continuar com o Google" }: { next: string | null; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!googleAuthEnabled) return null;

  async function signIn() {
    setLoading(true);
    setError(null);
    const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next ?? "/")}`;
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setLoading(false);
      setError(authErrorMessage(error.message));
    }
  }

  return (
    <div className="animate-element animate-delay-800 space-y-6">
      <div className="relative flex items-center justify-center">
        <span className="w-full border-t auth-rule" />
        <span className="auth-muted auth-paper-bg absolute px-4 text-sm">ou continue com</span>
      </div>
      <button type="button" onClick={signIn} disabled={loading} className="auth-outline-button">
        <GoogleIcon />
        {loading ? "Abrindo o Google…" : label}
      </button>
      {error && (
        <p role="alert" className="forge-auth-alert forge-auth-alert--error">
          {error}
        </p>
      )}
    </div>
  );
}
