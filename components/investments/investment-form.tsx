"use client";

import { createInvestmentAction } from "@/app/actions/investments";

export function InvestmentForm() {
  return (
    <form
      action={createInvestmentAction}
      className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-4"
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

      <button
        type="submit"
        className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
      >
        Salvar Investimento
      </button>
    </form>
  );
}