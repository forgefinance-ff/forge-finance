"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (password.length < 6) return;

    setLoading(true);

    const supabase = createClient();

    await supabase.auth.updateUser({
      password,
    });

    setPassword("");
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Input
        type="password"
        placeholder="Nova senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <Button
        onClick={handleSave}
        disabled={loading || password.length < 6}
      >
        {loading ? "Alterando..." : "Alterar Senha"}
      </Button>
    </div>
  );
}