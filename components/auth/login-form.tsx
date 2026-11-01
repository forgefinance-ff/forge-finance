"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

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

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleLogin}
      className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
    >
      <div>
        <label className="mb-2 block text-sm text-zinc-300">
          E-mail
        </label>

        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-brand-bright"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-zinc-300">
          Senha
        </label>

        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-brand-bright"
        />
      </div>

      <button
        disabled={loading}
        className="w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-bright disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        Ainda não possui uma conta?{" "}
        <Link
          href="/cadastro"
          className="font-medium text-brand-soft hover:text-brand-soft"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}