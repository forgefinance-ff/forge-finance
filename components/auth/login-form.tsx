"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";

import { GlassInputWrapper } from "@/components/ui/sign-in";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "./auth-errors";
import { GoogleButton } from "./google-button";
import { useNextParam, withNext } from "./use-next-param";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const next = useNextParam();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError(authErrorMessage(error.message));
      return;
    }

    router.push(next ?? "/");
    router.refresh();
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {error && (
        <p role="alert" className="forge-auth-alert forge-auth-alert--error">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className="forge-auth-label">
          E-mail
        </label>
        <GlassInputWrapper>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="forge-auth-input"
        />
        </GlassInputWrapper>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="login-password" className="forge-auth-label">
            Senha
          </label>
          <Link href="/esqueci-senha" className="forge-auth-link text-sm">
            Esqueci minha senha
          </Link>
        </div>
        <GlassInputWrapper>
        <div className="forge-auth-field">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="forge-auth-input forge-auth-input--pad-right"
          />
          <button
            type="button"
            className="forge-auth-eye"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        </GlassInputWrapper>
      </div>

      <button type="submit" disabled={loading} className="forge-auth-button">
        {loading ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
            Entrando…
          </>
        ) : (
          <>
            Entrar
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <GoogleButton next={next} />

      <p className="forge-auth-note text-center">
        Ainda não tem conta?{" "}
        <Link href={withNext("/cadastro", next)} className="forge-auth-link">
          Criar conta grátis
        </Link>
      </p>
    </form>
  );
}
