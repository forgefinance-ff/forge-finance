"use client";

import { ReceiptText, Trash2 } from "lucide-react";

type Props = {
  transactions: any[];
  deleteAction: (formData: FormData) => Promise<void>;
  hasAnyTransactions: boolean;
};

export function TransactionsList({
  transactions,
  deleteAction,
  hasAnyTransactions,
}: Props) {
  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#111827] text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
          <ReceiptText className="text-slate-500" size={30} />
        </div>

        <h3 className="text-xl font-semibold text-white">
          Nenhuma transação encontrada
        </h3>

        <p className="mt-2 max-w-sm text-sm text-slate-400">
          {hasAnyTransactions
            ? "Nenhum resultado para os filtros aplicados."
            : "Cadastre sua primeira receita ou despesa para começar."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">
      <table className="w-full">
        <thead className="border-b border-white/10 bg-white/[0.02]">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Descrição
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Conta
            </th>

            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              Categoria
            </th>

            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
              Valor
            </th>

            <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
              Data
            </th>

            <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                className="border-b border-white/5 transition hover:bg-white/[0.03]"
              >
                <td className="px-6 py-5">
                  <div className="font-medium text-white">
                    {transaction.description}
                  </div>
                </td>

                <td className="px-6 py-5 text-slate-300">
                  {transaction.accounts?.name}
                </td>

                <td className="px-6 py-5 text-slate-300">
                  <span className="mr-2">
                    {transaction.categories?.icon}
                  </span>
                  {transaction.categories?.name}
                </td>

                <td
                  className={`px-6 py-5 text-right font-semibold ${
                    isIncome ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {isIncome ? "+" : "-"}{" "}
                  {Number(transaction.amount).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </td>

                <td className="px-6 py-5 text-center text-slate-400">
                  {new Date(transaction.transaction_date).toLocaleDateString(
                    "pt-BR"
                  )}
                </td>

                <td className="px-6 py-5 text-right">
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={transaction.id} />

                    <button
                      type="submit"
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
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
