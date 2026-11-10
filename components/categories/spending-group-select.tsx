"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setCategorySpendingGroup } from "@/app/actions/raio-x";

export const SPENDING_GROUP_LABEL: Record<string, string> = {
  essential: "Essencial",
  lifestyle: "Estilo de vida",
};

/** Grupo de uma despesa do Pessoal (alimenta o "Para onde vai cada R$ 100" do Raio-X). */
export function SpendingGroupSelect({
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
      aria-label="Grupo de gasto"
      value={current}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value;
        const previous = current;
        setCurrent(next);
        startTransition(async () => {
          const result = await setCategorySpendingGroup(categoryId, next);
          if (!result.ok) {
            setCurrent(previous);
            toast.error(result.error);
          }
        });
      }}
      className={`mt-1 w-full rounded-lg border bg-background-soft px-2 py-1 text-xs outline-none transition focus:border-violet-500 ${
        current ? "border-line text-text-soft" : "border-line text-faint"
      }`}
    >
      <option value="">Sem grupo</option>
      {Object.entries(SPENDING_GROUP_LABEL).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}
