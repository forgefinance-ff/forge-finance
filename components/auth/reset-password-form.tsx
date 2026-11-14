"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircleIcon, ArrowRightIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "./auth-errors";

/** Define a senha nova (a pessoa chega aqui pelo link do e-mail, já com sessão). */
export function ResetPasswordForm({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasSession) {
    return (
      <div className="space-y-5">
        <p role="alert" className="forge-auth-alert forge-auth-alert--error">
          <AlertCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Este link expirou ou já foi usado. Peça um novo.
        </p>
        <Link href="/esqueci-senha" className="forge-auth-button">
          Pedir novo link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As duas senhas não são iguais.");
      return;
    }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(
        /same/i.test(error.message) ? "A senha nova precisa ser diferente da antiga." : authErrorMessage(error.message)
      );
      return;
    }
    router.push("/dashboard?senha=ok");
    router.refresh();
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
        <label htmlFor="reset-password" className="forge-auth-label">
          Senha nova
        </label>
        <div className="forge-auth-field">
          <input
            id="reset-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Pelo menos 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="forge-auth-input forge-auth-input--pad-right"
          />
          <button
            type="button"
            className="forge-auth-eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={show}
          >
            {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="reset-confirm" className="forge-auth-label">
          Repita a senha nova
        </label>
        <input
          id="reset-confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="forge-auth-input"
        />
      </div>

      <button type="submit" disabled={loading} className="forge-auth-button">
        {loading ? (
          <>
            <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />
            Salvando…
          </>
        ) : (
          <>
            Salvar senha nova
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
