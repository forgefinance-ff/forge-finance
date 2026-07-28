"use client";

import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Salvando..." : "Salvar Categoria"}
    </button>
  );
}

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function CategoryForm({ action }: Props) {
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-semibold text-white">
        Nova Categoria
      </h2>

      <input
        name="name"
        required
        placeholder="Nome da categoria"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
      />

      <select
        name="type"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      >
        <option value="expense">Despesa</option>
        <option value="income">Receita</option>
      </select>

      <input
        type="color"
        name="color"
        defaultValue="#3B82F6"
        className="h-12 w-full rounded-lg border border-zinc-700 bg-zinc-950"
      />

      <input
        name="icon"
        placeholder="Ícone (ex: 💰)"
        defaultValue="💰"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      />

      <SubmitButton />
    </form>
  );
}