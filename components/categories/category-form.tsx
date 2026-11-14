"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { KIND_HINT, KIND_LABEL, MOVEMENT_KINDS } from "@/lib/movement-kinds";

const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";

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
      <h2 className="text-xl font-semibold text-foreground">Nova categoria</h2>

      <div>
        <label htmlFor="category-name" className="mb-1.5 block text-xs font-medium text-faint">
          Nome
        </label>
        <input
          id="category-name"
          name="name"
          required
          maxLength={40}
          placeholder="Ex.: Mercado, Academia"
          className={inputClass}
        />
      </div>

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
        <div>
          <label htmlFor="category-color" className="mb-1.5 block text-xs font-medium text-faint">
            Cor
          </label>
          <input
            id="category-color"
            type="color"
            name="color"
            defaultValue="#7C3AED"
            className="h-[50px] w-full cursor-pointer rounded-xl border border-line-strong bg-surface-solid"
          />
        </div>

        <div>
          <label htmlFor="category-icon" className="mb-1.5 block text-xs font-medium text-faint">
            Ícone (um emoji)
          </label>
          <input id="category-icon" name="icon" maxLength={4} placeholder="💰" defaultValue="💰" className={inputClass} />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar categoria"}
      </Button>
    </form>
  );
}
