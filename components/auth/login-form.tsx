"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useNextParam, withNext } from "./use-next-param";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const next = useNextParam();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push(next ?? "/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleLogin}
      className="forge-auth-card space-y-5 rounded-2xl p-6 sm:p-8"
    >
      <div>
        <label htmlFor="login-email" className="mb-2 block text-sm text-zinc-300">
          E-mail
        </label>

        <input
          id="login-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="mb-2 block text-sm text-zinc-300">
          Senha
        </label>

        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <button
        disabled={loading}
        className="forge-auth-button"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        Ainda não possui uma conta?{" "}
        <Link
          href={withNext("/cadastro", next)}
          className="font-medium text-violet-300 transition hover:text-violet-200"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}