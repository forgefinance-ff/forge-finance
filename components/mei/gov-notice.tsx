import { InfoIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export const GOV_PORTAL_URL = "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor";

/** Aviso obrigatório nas telas de impostos do MEI. */
export function GovNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-text-soft",
        className
      )}
    >
      <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <span>
        Confira os valores atuais no Portal do Empreendedor (
        <a
          href={GOV_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2 hover:text-brand-soft"
        >
          gov.br/empresas-e-negocios/pt-br/empreendedor
        </a>
        ). O Forge Finance não substitui um contador.
      </span>
    </p>
  );
}
