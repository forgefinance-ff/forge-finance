"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

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
      className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
    >
      <div>
        <label className="mb-2 block text-sm text-zinc-300">Nome</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-brand-bright"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-zinc-300">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-brand-bright"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-zinc-300">Senha</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-brand-bright"
        />
      </div>

      <button
        disabled={loading}
        className="w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-bright disabled:opacity-60"
      >
        {loading ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        Já possui uma conta?{" "}
        <Link href="/login" className="text-brand-soft hover:text-brand-soft">
          Entrar
        </Link>
      </p>
    </form>
  );
}