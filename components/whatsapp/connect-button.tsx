"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { claimWhatsappOnboarding } from "@/app/actions/whatsapp";

export function ConnectWhatsappButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [digits, setDigits] = useState("");

  function connect() {
    setError(null);
    if (digits.length !== 4) {
      setError("Digite os 4 últimos números do seu WhatsApp.");
      return;
    }
    startTransition(async () => {
      const result = await claimWhatsappOnboarding(token, digits);
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
      <label className="block space-y-1.5">
        <span className="forge-auth-note">4 últimos números do SEU WhatsApp</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={digits}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="forge-auth-input w-full text-center tracking-[0.4em]"
          placeholder="0000"
          aria-label="4 últimos números do seu WhatsApp"
        />
      </label>
      <button type="button" onClick={connect} disabled={pending} className="forge-auth-button">
        {pending ? "Conectando..." : "Conectar este WhatsApp"}
      </button>
      {error && (
        <p role="alert" className="forge-auth-alert forge-auth-alert--error justify-center">
          {error}
        </p>
      )}
    </div>
  );
}
