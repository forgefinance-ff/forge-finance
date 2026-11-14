"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteCardAction } from "@/app/actions/cards";
import { Button } from "@/components/ui/button";

/** Excluir cartão pede confirmação (antes era um clique só). */
export function DeleteCardButton({ id, name }: { id: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    const formData = new FormData();
    formData.set("id", id);
    start(async () => {
      try {
        await deleteCardAction(formData);
        toast.success(`Cartão ${name} excluído.`);
      } catch {
        toast.error("Não foi possível excluir. Cartões com compras registradas não podem ser excluídos.");
        setConfirming(false);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Excluir o cartão ${name}`}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-faint transition hover:bg-danger/10 hover:text-danger"
      >
        <Trash2 className="h-5 w-5" aria-hidden />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Confirmar exclusão do cartão ${name}`}>
      <Button type="button" variant="destructive" className="min-h-11" disabled={pending} onClick={remove}>
        {pending ? "Excluindo..." : "Excluir cartão"}
      </Button>
      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </div>
  );
}
