"use client";

import { useTransition } from "react";

import { createCardAction } from "@/app/actions/cards";
import { Button } from "@/components/ui/button";

export function CardForm() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createCardAction(formData);
      (document.getElementById("card-form") as HTMLFormElement)?.reset();
    });
  }

  return (
    <form
      id="card-form"
      action={handleSubmit}
      className="rounded-3xl border border-white/10 bg-[#111827] p-6 space-y-4"
    >
      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Nome do cartão
        </label>

        <input
          name="name"
          required
          placeholder="Ex.: Nubank"
          className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Limite
          </label>

          <input
            type="number"
            step="0.01"
            name="limit_amount"
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Cor
          </label>

          <input
            type="color"
            name="color"
            defaultValue="#7C3AED"
            className="h-12 w-full rounded-lg border border-white/10 bg-[#09090B]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Dia do fechamento
          </label>

          <input
            type="number"
            min={1}
            max={31}
            name="closing_day"
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Dia do vencimento
          </label>

          <input
            type="number"
            min={1}
            max={31}
            name="due_day"
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Cartão"}
      </Button>
    </form>
  );
}