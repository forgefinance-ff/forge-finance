"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  initialName: string;
};

export function UpdateProfileForm({ initialName }: Props) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    const supabase = createClient();

    await supabase.auth.updateUser({
      data: {
        full_name: name,
      },
    });

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-text-soft">
          Como quer ser chamado
        </label>
        <Input
          id="profile-name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
        />
      </div>

      <Button className="min-h-11" onClick={handleSave} disabled={loading}>
        {loading ? "Salvando..." : "Salvar nome"}
      </Button>
    </div>
  );
}