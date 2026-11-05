"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { claimWhatsappOnboarding } from "@/app/actions/whatsapp";

export function ConnectWhatsappButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function connect() {
    setError(null);
    startTransition(async () => {
      const result = await claimWhatsappOnboarding(token);
      if (result.ok) {
        router.push("/whatsapp?conectado=1");
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={connect} disabled={pending} className="forge-auth-button">
        {pending ? "Conectando..." : "Conectar este WhatsApp"}
      </button>
      {error && (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
