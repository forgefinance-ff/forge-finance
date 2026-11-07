"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SmartphoneIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InstallGuide, markInstalled, useProbablyInstalled } from "./install-guide";

const SNOOZE_KEY = "ff_install_prompt_snooze";
const SNOOZE_DAYS = 7;

/**
 * Primeira instrução do Forge: na primeira vez que a pessoa entra, ensina a fixar
 * o site na tela inicial (celular) ou instalar no computador, para usar igual app.
 * Se ela tocar em "Agora não", volta a lembrar depois de 7 dias.
 */
export function InstallAppPrompt() {
  const pathname = usePathname();
  const { ready, installed } = useProbablyInstalled();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ready || installed) return;

    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      if (until > Date.now()) return;
    } catch {}

    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [ready, installed]);

  // Na tela de checkout não atrapalha.
  if (pathname?.startsWith("/assinatura")) return null;

  function snooze() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
    } catch {}
    setOpen(false);
  }

  function done() {
    markInstalled();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : snooze())}>
      <DialogContent className="max-h-[90dvh] gap-5 overflow-y-auto p-6 sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <span className="mb-1 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl shadow-[0_12px_40px_-12px_rgba(124,58,237,0.8)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={56} height={56} />
          </span>
          <DialogTitle className="text-xl font-bold">Coloque o Forge na sua tela inicial</DialogTitle>
          <DialogDescription>
            Assim ele abre igual a um app: em tela cheia, com ícone próprio e sem precisar procurar o site. Leva 10
            segundos e não ocupa espaço.
          </DialogDescription>
        </DialogHeader>

        <InstallGuide onInstalled={done} />

        <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row-reverse">
          <button
            type="button"
            onClick={done}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 text-sm font-semibold text-foreground transition hover:bg-violet-500/20"
          >
            <SmartphoneIcon className="h-4 w-4" /> Já adicionei
          </button>
          <button
            type="button"
            onClick={snooze}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Agora não
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
