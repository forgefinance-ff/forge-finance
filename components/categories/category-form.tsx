"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none transition focus:border-violet-500";

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function CategoryForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      (document.getElementById("category-form") as HTMLFormElement)?.reset();
    });
  }

  return (
    <form
      id="category-form"
      action={handleSubmit}
      className="space-y-4 rounded-3xl border border-white/10 bg-[#111827] p-6"
    >
      <h2 className="text-xl font-semibold text-white">Nova Categoria</h2>

      <input
        name="name"
        required
        placeholder="Nome da categoria"
        className={inputClass}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <select name="type" className={`${inputClass} sm:col-span-1`}>
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>

        <input
          type="color"
          name="color"
          defaultValue="#7C3AED"
          className="h-[50px] w-full cursor-pointer rounded-xl border border-white/10 bg-[#09090B] sm:col-span-1"
        />

        <input
          name="icon"
          placeholder="Ícone (ex: 💰)"
          defaultValue="💰"
          className={`${inputClass} sm:col-span-1`}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Categoria"}
      </Button>
    </form>
  );
}
