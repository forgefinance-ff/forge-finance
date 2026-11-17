"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { markSummarySeen } from "./mark-seen";

/** Aviso que aparece uma vez: no último dia do mês (ou nos 3 primeiros do seguinte). */
export function SummaryReady({ month, monthName }: { month: string; monthName: string }) {
  const [open, setOpen] = useState(true);

  function close() {
    markSummarySeen(month);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <DialogTitle>Seu resumo de {monthName} está pronto</DialogTitle>
          <DialogDescription>
            Quanto entrou, quanto saiu, quanto sobrou e onde o dinheiro foi. Leva 1 minuto.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Depois
          </Button>
          <Link href={`/resumo?mes=${month}`} onClick={close} className={buttonVariants()}>
            Ver meu resumo
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
