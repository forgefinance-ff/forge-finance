"use client";

import { Trash2 } from "lucide-react";

type Props = {
  transactions: any[];
  deleteAction: (formData: FormData) => Promise<void>;
};

export function TransactionsList({
  transactions,
  deleteAction,
}: Props) {
  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">
            Nenhuma transação encontrada
          </h3>

          <p className="mt-2 text-zinc-400">
            Cadastre sua primeira receita ou despesa para começar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <table className="w-full">
        <thead className="border-b border-zinc-800 bg-zinc-950/40">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Descrição
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Conta
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Categoria
            </th>

            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Valor
            </th>

            <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Data
            </th>

            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Ações
            </th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((transaction: any) => {
            const isIncome = transaction.type === "income";

            return (
              <tr
                key={transaction.id}
                className="border-b border-zinc-800 transition hover:bg-zinc-800/40"
              >
                <td className="px-6 py-5">
                  <div className="font-medium text-white">
                    {transaction.description}
                  </div>
                </td>

                <td className="px-6 py-5 text-zinc-300">
                  {transaction.accounts?.name}
                </td>

                <td className="px-6 py-5 text-zinc-300">
                  <span className="mr-2">
                    {transaction.categories?.icon}
                  </span>

                  {transaction.categories?.name}
                </td>

                <td
                  className={`px-6 py-5 text-right font-semibold ${
                    isIncome
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {isIncome ? "+" : "-"}{" "}
                  {Number(transaction.amount).toLocaleString(
                    "pt-BR",
                    {
                      style: "currency",
                      currency: "BRL",
                    }
                  )}
                </td>

                <td className="px-6 py-5 text-center text-zinc-400">
                  {new Date(
                    transaction.transaction_date
                  ).toLocaleDateString("pt-BR")}
                </td>

                <td className="px-6 py-5 text-right">
                  <form action={deleteAction}>
                    <input
                      type="hidden"
                      name="id"
                      value={transaction.id}
                    />

                    <button
                      type="submit"
                      className="rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}