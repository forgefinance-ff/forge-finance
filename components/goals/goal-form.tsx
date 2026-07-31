"use client";

import { useTransition } from "react";

import { createGoalAction } from "@/app/actions/goals";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/goals";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none transition focus:border-violet-500";

type Props = {
  action?: (formData: FormData) => Promise<void>;
  goal?: Goal;
  onSuccess?: () => void;
  submitLabel?: string;
  title?: string;
};

export function GoalForm({
  action = createGoalAction,
  goal,
  onSuccess,
  submitLabel,
  title,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);

      if (onSuccess) {
        onSuccess();
      } else {
        (document.getElementById("goal-form") as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <form
      id="goal-form"
      action={handleSubmit}
      className="rounded-3xl border border-white/10 bg-[#111827] p-6 space-y-4"
    >
      <h2 className="text-xl font-semibold text-white">
        {title ?? (goal ? "Editar Meta" : "Nova Meta")}
      </h2>

      {goal && <input type="hidden" name="id" value={goal.id} />}

      <div>
        <label className="mb-2 block text-sm text-slate-300">
          Nome da meta
        </label>

        <input
          name="title"
          required
          defaultValue={goal?.title}
          placeholder="Ex.: Reserva de Emergência"
          className={inputClass}
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
            defaultValue={goal?.target_amount}
            className={inputClass}
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
            defaultValue={goal?.current_amount ?? 0}
            required
            className={inputClass}
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
          defaultValue={goal?.deadline?.slice(0, 10)}
          className={inputClass}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? "Salvando..."
          : submitLabel ?? (goal ? "Salvar Alterações" : "Salvar Meta")}
      </Button>
    </form>
  );
}
