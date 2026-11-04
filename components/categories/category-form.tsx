"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { KIND_HINT, KIND_LABEL, MOVEMENT_KINDS } from "@/lib/movement-kinds";

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-4 py-3 text-foreground outline-none transition focus:border-violet-500";

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function CategoryForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [kind, setKind] = useState<keyof typeof KIND_HINT>("regular");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      (document.getElementById("category-form") as HTMLFormElement)?.reset();
      setKind("regular");
    });
  }

  return (
    <form
      id="category-form"
      action={handleSubmit}
      className="space-y-4 rounded-[22px] border border-line bg-surface p-6"
    >
      <h2 className="text-xl font-semibold text-foreground">Nova Categoria</h2>

      <input
        name="name"
        required
        placeholder="Nome da categoria"
        className={inputClass}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-faint">Entrada ou saída</span>
          <select name="type" className={inputClass}>
            <option value="expense">Saída (despesa)</option>
            <option value="income">Entrada (receita)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-faint">Natureza</span>
          <select
            name="kind"
            defaultValue="regular"
            className={inputClass}
            onChange={(event) => setKind(event.target.value as keyof typeof KIND_HINT)}
          >
            {MOVEMENT_KINDS.map((option) => (
              <option key={option} value={option}>
                {KIND_LABEL[option]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-faint">{KIND_HINT[kind]}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="color"
          name="color"
          defaultValue="#7C3AED"
          className="h-[50px] w-full cursor-pointer rounded-xl border border-line bg-background-soft"
        />

        <input
          name="icon"
          placeholder="Ícone (ex: 💰)"
          defaultValue="💰"
          className={inputClass}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Categoria"}
      </Button>
    </form>
  );
}
