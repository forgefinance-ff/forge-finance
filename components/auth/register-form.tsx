"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { getSiteUrl } from "@/lib/site-url";

export function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback`,
        data: {
          name,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Conta criada com sucesso!");

    router.push("/login");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleRegister}
      className="forge-auth-card space-y-5 rounded-2xl p-6 sm:p-8"
    >
      <div>
        <label htmlFor="register-name" className="mb-2 block text-sm text-zinc-300">Nome</label>
        <input
          id="register-name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <div>
        <label htmlFor="register-email" className="mb-2 block text-sm text-zinc-300">E-mail</label>
        <input
          id="register-email"
          autoComplete="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <div>
        <label htmlFor="register-password" className="mb-2 block text-sm text-zinc-300">Senha</label>
        <input
          id="register-password"
          autoComplete="new-password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <button
        disabled={loading}
        className="forge-auth-button"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        Já possui uma conta?{" "}
        <Link href="/login" className="font-medium text-violet-300 transition hover:text-violet-200">
          Entrar
        </Link>
      </p>
    </form>
  );
}