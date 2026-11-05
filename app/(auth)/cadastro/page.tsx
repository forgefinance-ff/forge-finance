"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
const whatsappStart = botNumber
  ? `https://wa.me/${botNumber}?text=${encodeURIComponent("Quero começar no Forge Finance")}`
  : null;

export default function CadastroPage() {
  return (
    <AuthShell subtitle="Crie sua conta para começar.">
      <RegisterForm />

      {whatsappStart && (
        <p className="mt-5 text-center text-sm text-zinc-400">
          Prefere usar pelo WhatsApp?{" "}
          <a
            href={whatsappStart}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-emerald-300 transition hover:text-emerald-200"
          >
            Começar pelo WhatsApp
          </a>
        </p>
      )}
    </AuthShell>
  );
}
