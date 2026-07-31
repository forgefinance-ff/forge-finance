"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Account } from "@/lib/accounts";
import { Category } from "@/lib/categories";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none transition focus:border-violet-500";

type Props = {
  action: (formData: FormData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
};

export function TransactionForm({
  action,
  accounts,
  categories,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      onSuccess?.();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/10 bg-[#111827] p-6"
    >
      <h2 className="text-xl font-semibold text-white">Nova Transação</h2>

      <input
        name="description"
        required
        placeholder="Descrição"
        className={inputClass}
      />

      <select name="account_id" required className={inputClass}>
        <option value="">Selecione a conta</option>

        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>

      <select name="category_id" required className={inputClass}>
        <option value="">Selecione a categoria</option>

        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.icon} {category.name}
          </option>
        ))}
      </select>

      <select name="type" className={inputClass}>
        <option value="expense">Despesa</option>
        <option value="income">Receita</option>
      </select>

      <input
        type="number"
        step="0.01"
        name="amount"
        required
        placeholder="Valor"
        className={inputClass}
      />

      <input
        type="date"
        name="transaction_date"
        required
        className={inputClass}
      />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Transação"}
      </Button>
    </form>
  );
}
