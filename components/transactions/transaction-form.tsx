"use client";

import { useFormStatus } from "react-dom";
import { Account } from "@/lib/accounts";
import { Category } from "@/lib/categories";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
    >
      {pending ? "Salvando..." : "Salvar Transação"}
    </button>
  );
}

type Props = {
  action: (formData: FormData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
};

export function TransactionForm({
  action,
  accounts,
  categories,
}: Props) {
  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6"
    >
      <h2 className="text-xl font-semibold text-white">
        Nova Transação
      </h2>

      <input
        name="description"
        required
        placeholder="Descrição"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      />

      <select
        name="account_id"
        required
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      >
        <option value="">Selecione a conta</option>

        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>

      <select
        name="category_id"
        required
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      >
        <option value="">Selecione a categoria</option>

        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.icon} {category.name}
          </option>
        ))}
      </select>

      <select
        name="type"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      >
        <option value="expense">Despesa</option>
        <option value="income">Receita</option>
      </select>

      <input
        type="number"
        step="0.01"
        name="amount"
        required
        placeholder="Valor"
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      />

      <input
        type="date"
        name="transaction_date"
        required
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-white"
      />

      <SubmitButton />
    </form>
  );
}