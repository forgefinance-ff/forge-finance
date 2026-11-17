"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

const botNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
const whatsappStart = botNumber
  ? `https://wa.me/${botNumber}?text=${encodeURIComponent("Quero começar no Forge Finance")}`
  : null;

export default function CadastroPage() {
  return (
    <AuthShell
      title={
        <>
          Crie sua conta <strong>grátis</strong>
        </>
      }
      subtitle="Leva menos de um minuto. Depois é só mandar seus gastos por mensagem."
    >
      <RegisterForm />

      {whatsappStart && (
        <p className="forge-auth-note mt-5 text-center">
          Prefere usar pelo WhatsApp?{" "}
          <a
            href={whatsappStart}
            target="_blank"
            rel="noreferrer"
            className="forge-auth-link !text-[oklch(50%_0.13_160)]"
          >
            Começar pelo WhatsApp
          </a>
        </p>
      )}
    </AuthShell>
  );
}
