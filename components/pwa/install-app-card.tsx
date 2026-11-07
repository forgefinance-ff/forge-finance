"use client";

import { SmartphoneIcon } from "lucide-react";

import { InstallGuide } from "./install-guide";

/** Instrução de instalação fixa (Primeiros passos e Configurações), para rever quando quiser. */
export function InstallAppCard({ className }: { className?: string }) {
  return (
    <section className={className ?? "rounded-[22px] border border-line bg-surface p-6"}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-brand-soft">
          <SmartphoneIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Use o Forge como app</h2>
          <p className="text-sm text-muted-foreground">
            Fixe na tela inicial do celular ou instale no computador. Abre em tela cheia, com ícone próprio.
          </p>
        </div>
      </div>
      <InstallGuide />
    </section>
  );
}
