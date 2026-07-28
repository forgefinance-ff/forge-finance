"use client";

import { createGoalAction } from "@/app/actions/goals";

export function GoalForm() {
  return (
    <form
      action={createGoalAction}
      className="rounded-2xl border border-white/10 bg-[#111827] p-6 space-y-4"
    >
      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Nome da meta
        </label>

        <input
          name="title"
          required
          placeholder="Ex.: Reserva de Emergência"
          className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-slate-300">
            Valor da meta
          </label>

          <input
            type="number"
            step="0.01"
            name="target_amount"
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
            defaultValue={0}
            required
            className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Data limite
        </label>

        <input
          type="date"
          name="deadline"
          required
          className="w-full rounded-lg border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none focus:border-violet-500"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white transition hover:bg-violet-500"
      >
        Salvar Meta
      </button>
    </form>
  );
}