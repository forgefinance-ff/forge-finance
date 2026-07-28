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
      {pending ? "Salvando..." : "Salvar Conta"}
    </button>
  );
}

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function AccountForm({ action }: Props) {
  return (
    <form action={action} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-xl font-semibold text-white">
        Nova Conta
      </h2>

      <input
        name="name"
        required
        placeholder="Nome da conta"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none"
      />

      <select
        name="type"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      >
        <option value="Conta Corrente">Conta Corrente</option>
        <option value="Poupança">Poupança</option>
        <option value="Carteira">Carteira</option>
        <option value="Investimento">Investimento</option>
      </select>

      <input
        type="color"
        name="color"
        defaultValue="#3B82F6"
        className="h-12 w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-950"
      />

      <input
        type="number"
        step="0.01"
        name="initial_balance"
        defaultValue="0"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      />

      <SubmitButton />
    </form>
  );
}