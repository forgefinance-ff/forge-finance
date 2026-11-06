import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LandingPage } from "@/components/landing/landing-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Forge Finance · Seu dinheiro organizado pelo WhatsApp",
  description:
    "Mande um áudio ou uma mensagem com o gasto. O Forge registra, categoriza e responde quanto sobrou, direto no WhatsApp.",
};

/** Visitante vê a página de vendas; quem já entrou vai direto para o painel. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return <LandingPage />;
}
