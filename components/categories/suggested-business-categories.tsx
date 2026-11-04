"use client";

import { useTransition } from "react";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { createBusinessDefaults } from "@/app/actions/scope";
import { Button } from "@/components/ui/button";

/** Adiciona à Empresa as categorias sugeridas que ainda faltam (não duplica). */
export function SuggestedBusinessCategories() {
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      try {
        const formData = new FormData();
        await createBusinessDefaults(formData);
        toast.success("Categorias sugeridas adicionadas.");
      } catch {
        toast.error("Não foi possível adicionar as categorias. Tente de novo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-brand-bright/25 bg-brand/10 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-foreground">Categorias sugeridas para a empresa</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Comissões, insumos, embalagens, anúncios, contabilidade, maquininha, frete, aluguel e
          outras. Só entram as que você ainda não tem.
        </p>
      </div>
      <Button type="button" onClick={run} disabled={isPending} className="shrink-0">
        <SparklesIcon className="h-4 w-4" />
        {isPending ? "Adicionando…" : "Adicionar sugeridas"}
      </Button>
    </div>
  );
}
