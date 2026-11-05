"use client";
import type { getTransactions } from "@/lib/transactions";

import { ReceiptText, Trash2 } from "lucide-react";

import { transactionKindLabel } from "@/lib/movement-kinds";
import { formatDateBR } from "@/lib/dates";

type Props = {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
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
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-tint">
          <ReceiptText className="text-faint" size={30} />
        </div>

        <h3 className="text-xl font-semibold text-foreground">
          Nenhuma transação encontrada
        </h3>

        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {hasAnyTransactions
            ? "Nenhum resultado para os filtros aplicados."
            : "Cadastre sua primeira receita ou despesa para começar."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-line bg-tint">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-faint">
                Descrição
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-faint">
                Conta / cartão
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-faint">
                Categoria
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-faint">
                Valor
              </th>

              <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-faint">
                Data
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-faint">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => {
              const isIncome = transaction.type === "income";

              return (
                <tr
                  key={transaction.id}
                  className="border-b border-line transition hover:bg-tint"
                >
                  <td className="px-6 py-5">
                    <div className="font-medium text-foreground">
                      {transaction.description}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-text-soft">
                    {transaction.accounts?.name ?? (transaction.cards?.name ? `💳 ${transaction.cards.name}` : "—")}
                    {transaction.cards?.name && transaction.accounts?.name && (
                      <span className="block text-xs text-faint">fatura 💳 {transaction.cards.name}</span>
                    )}
                    {transaction.cards?.name && !transaction.accounts?.name && (
                      <span className="block text-xs text-faint">crédito · na fatura</span>
                    )}
                  </td>

                  <td className="px-6 py-5 text-text-soft">
                    <span className="mr-2">
                      {transaction.categories?.icon}
                    </span>
                    {transaction.categories?.name}
                    {transactionKindLabel(transaction.kind) && (
                      <span className="ml-2 rounded-full border border-brand-bright/30 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand-soft">
                        {transactionKindLabel(transaction.kind)}
                      </span>
                    )}
                  </td>

                  <td
                    className={`px-6 py-5 text-right font-semibold ${
                      isIncome ? "text-success" : "text-danger"
                    }`}
                  >
                    {isIncome ? "+" : "-"}{" "}
                    {Number(transaction.amount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>

                  <td className="px-6 py-5 text-center text-muted-foreground">
                    {formatDateBR(String(transaction.transaction_date))}
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
                        className="rounded-lg p-2 text-faint transition hover:bg-rose-500/10 hover:text-danger"
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
    </div>
  );
}
