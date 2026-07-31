"use client";

import { useTransition } from "react";

import { createGoalAction } from "@/app/actions/goals";
import { Button } from "@/components/ui/button";

export function GoalForm() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createGoalAction(formData);
      (document.getElementById("goal-form") as HTMLFormElement)?.reset();
    });
  }

  return (
    <form
      id="goal-form"
      action={handleSubmit}
      className="rounded-3xl border border-white/10 bg-[#111827] p-6 space-y-4"
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

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Meta"}
      </Button>
    </form>
  );
}