"use client";

import { createCardAction } from "@/app/actions/cards";

export function CardForm() {
  return (
    <form
      action={createCardAction}
      className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-4"
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

      <button
        type="submit"
        className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
      >
        Salvar Cartão
      </button>
    </form>
  );
}