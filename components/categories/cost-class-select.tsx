"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setCategoryCostClass } from "@/app/actions/business";

export const COST_CLASS_LABEL: Record<string, string> = {
  variable: "Custo variável",
  fixed: "Custo fixo",
  tax: "Imposto",
  prolabore: "Pró-labore",
};

/** Classe de custo de uma despesa da Empresa (alimenta a DRE). */
export function CostClassSelect({
  categoryId,
  value,
}: {
  categoryId: string;
  value: string | null;
}) {
  const [current, setCurrent] = useState(value ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <select
      aria-label="Classe de custo"
      value={current}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value;
        const previous = current;
        setCurrent(next);
        startTransition(async () => {
          const result = await setCategoryCostClass(categoryId, next);
          if (!result.ok) {
            setCurrent(previous);
            toast.error(result.error);
          }
        });
      }}
      className={`mt-1 w-full rounded-lg border bg-background-soft px-2 py-1 text-xs outline-none transition focus:border-violet-500 ${
        current ? "border-line text-text-soft" : "border-warning/50 text-warning"
      }`}
    >
      <option value="">Sem classificação</option>
      {Object.entries(COST_CLASS_LABEL).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
