"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AlertCircleIcon, ArrowRightIcon, Loader2Icon, MailCheckIcon } from "lucide-react";

import { GlassInputWrapper } from "@/components/ui/sign-in";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "./auth-errors";
import { GoogleButton } from "./google-button";
import { useNextParam, withNext } from "./use-next-param";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const next = useNextParam();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(authErrorMessage(error.message));
      return;
    }

    // Sem confirmação de e-mail a sessão já vem pronta: segue direto.
    if (data.session) {
      router.push(next ?? "/");
      router.refresh();
      return;
    }

    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="space-y-5">
        <p role="status" className="forge-auth-alert forge-auth-alert--info">
          <MailCheckIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Conta criada! Enviamos um link de confirmação para <strong>{sentTo}</strong>. Confirme e
            depois entre.
          </span>
        </p>
        <Link href={withNext("/login", next)} className="forge-auth-button">
          Ir para o login
          <ArrowRightIcon className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      {error && (
        <p role="alert" className="forge-auth-alert forge-auth-alert--error">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      <div>
        <label htmlFor="register-name" className="forge-auth-label">Nome</label>
        <GlassInputWrapper>
        <input
          id="register-name"
          autoComplete="name"
          required
          placeholder="Como quer ser chamado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="forge-auth-input"
        />
        </GlassInputWrapper>
      </div>

      <div>
        <label htmlFor="register-email" className="forge-auth-label">E-mail</label>
        <GlassInputWrapper>
        <input
          id="register-email"
          autoComplete="email"
          type="email"
          required
          placeholder="voce@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="forge-auth-input"
        />
        </GlassInputWrapper>
      </div>

      <div>
        <label htmlFor="register-password" className="forge-auth-label">Senha</label>
        <GlassInputWrapper>
        <input
          id="register-password"
          autoComplete="new-password"
          type="password"
          required
          minLength={6}
          placeholder="Mínimo de 6 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="forge-auth-input"
        />
        </GlassInputWrapper>
      </div>

      <button type="submit" disabled={loading} className="forge-auth-button">
        {loading ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
            Criando conta…
          </>
        ) : (
          <>
            Criar conta
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>

      <GoogleButton next={next} label="Criar conta com o Google" />

      <p className="forge-auth-note text-center">
        Já tem conta?{" "}
        <Link href={withNext("/login", next)} className="forge-auth-link">
          Entrar
        </Link>
      </p>
    </form>
  );
}