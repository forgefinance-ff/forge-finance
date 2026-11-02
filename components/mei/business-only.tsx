"use client";

import { useTransition } from "react";
import { Building2Icon } from "lucide-react";
import { toast } from "sonner";

import { setActiveScope } from "@/app/actions/scope";
import { EmptyState } from "@/components/mei/empty-state";
import { Button } from "@/components/ui/button";

/** Mostrado nas telas que só existem no escopo Empresa (Clientes, Impostos). */
export function BusinessOnly({ feature }: { feature: string }) {
  const [isPending, startTransition] = useTransition();

  function switchToBusiness() {
    startTransition(async () => {
      try {
        await setActiveScope("business");
      } catch {
        toast.error("Não foi possível trocar para Empresa. Tente de novo.");
      }
    });
  }

  return (
    <EmptyState
      icon={Building2Icon}
      title={`${feature} fica no modo Empresa`}
      description="Esta área é do seu MEI. Troque para Empresa para ver e cadastrar os dados do negócio, sem misturar com as finanças pessoais."
    >
      <Button onClick={switchToBusiness} disabled={isPending}>
        {isPending ? "Trocando…" : "Ir para Empresa"}
      </Button>
    </EmptyState>
  );
}
