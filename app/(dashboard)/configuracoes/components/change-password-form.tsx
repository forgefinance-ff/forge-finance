"use client";

import { useState } from "react";
import { toast } from "sonner";

import { authErrorMessage } from "@/components/auth/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(/same/i.test(error.message) ? "A senha nova precisa ser diferente da atual." : authErrorMessage(error.message));
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Senha alterada.");
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-text-soft">
            Senha nova
          </label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="Pelo menos 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-text-soft">
            Repita a senha nova
          </label>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" className="min-h-11" disabled={loading || password.length === 0}>
        {loading ? "Alterando..." : "Alterar senha"}
      </Button>
    </form>
  );
}
