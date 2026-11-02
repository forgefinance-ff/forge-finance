import { notFound } from "next/navigation";

import { PageHeader } from "@/components/mei/page-header";
import { WhatsappSimulator } from "@/components/whatsapp/simulator";

export const dynamic = "force-dynamic";

/** Simulador do bot: só existe em desenvolvimento. */
export default function WhatsappSimulatorPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Desenvolvimento"
        title="Simulador do WhatsApp"
        description="Testa o bot sem celular: o mesmo fluxo do webhook, com o seu número vinculado. As respostas aparecem aqui em vez de irem para a Meta."
      />
      <WhatsappSimulator />
    </div>
  );
}
