"use client";

import { useTransition } from "react";

import { createInvestmentAction } from "@/app/actions/investments";
import { Button } from "@/components/ui/button";

export function InvestmentForm() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createInvestmentAction(formData);
      (
        document.getElementById("investment-form") as HTMLFormElement
      )?.reset();
    });
  }

  return (
    <form
      id="investment-form"
      action={handleSubmit}
      className="rounded-3xl border border-white/10 bg-[#111827] p-6 space-y-4"
    >
      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Nome do investimento
        </label>

        <input
          name="name"
          required
          placeholder="Ex.: Tesouro Selic"
          className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Tipo
          </label>

          <select
            name="type"
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          >
            <option value="Renda Fixa">Renda Fixa</option>
            <option value="Renda Variável">Renda Variável</option>
            <option value="Fundos">Fundos</option>
            <option value="Cripto">Cripto</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Instituição
          </label>

          <input
            name="institution"
            required
            placeholder="Ex.: Nubank"
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Valor investido
          </label>

          <input
            type="number"
            step="0.01"
            name="invested_amount"
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Valor atual
          </label>

          <input
            type="number"
            step="0.01"
            name="current_amount"
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Investimento"}
      </Button>
    </form>
  );
}