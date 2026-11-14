"use client";

import { useTransition, useId } from "react";

import { createGoalAction } from "@/app/actions/goals";
import { Button } from "@/components/ui/button";
import type { Goal } from "@/lib/goals";
import { MoneyInput } from "@/components/ui/money-input";

const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";

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
  const fid = useId();
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
      className="rounded-[22px] border border-line bg-surface p-6 space-y-4"
    >
      <h2 className="text-xl font-semibold text-foreground">
        {title ?? (goal ? "Editar Meta" : "Nova Meta")}
      </h2>

      {goal && <input type="hidden" name="id" value={goal.id} />}

      <div>
        <label htmlFor={`${fid}-1`} className="mb-2 block text-sm text-text-soft">
          Nome da meta
        </label>

        <input id={`${fid}-1`}
          name="title"
          required
          defaultValue={goal?.title}
          placeholder="Ex.: Reserva de Emergência"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={`${fid}-2`} className="mb-2 block text-sm text-text-soft">
            Valor da meta
          </label>

          <MoneyInput id={`${fid}-2`}
            name="target_amount"
            required
            defaultValue={goal?.target_amount}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${fid}-3`} className="mb-2 block text-sm text-text-soft">
            Valor atual
          </label>

          <MoneyInput id={`${fid}-3`}
            name="current_amount"
            defaultValue={goal?.current_amount ?? 0}
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${fid}-4`} className="mb-2 block text-sm text-text-soft">
          Data limite
        </label>

        <input id={`${fid}-4`}
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
