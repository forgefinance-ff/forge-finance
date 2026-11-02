import {
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
} from "lucide-react";

import { formatDateBR } from "@/lib/dates";

import { RecentTransaction } from "@/lib/dashboard";

type RecentTransactionsProps = {
  transactions: RecentTransaction[];
};

export function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <section className="rounded-[22px] border border-line bg-surface p-6">
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-tint">
            <ReceiptText
              className="text-faint"
              size={30}
            />
          </div>

          <h3 className="text-lg font-semibold text-foreground">
            Nenhuma transação encontrada
          </h3>

          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Quando você cadastrar sua primeira movimentação,
            ela aparecerá aqui.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-foreground">
            Últimas transações
          </h3>

          <p className="text-sm text-muted-foreground">
            Movimentações mais recentes
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => {
          const income = transaction.type === "income";

          return (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-2xl border border-line bg-tint p-4 transition hover:border-violet-500/20 hover:bg-tint"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    income
                      ? "bg-emerald-500/15"
                      : "bg-rose-500/15"
                  }`}
                >
                  {income ? (
                    <ArrowDownLeft
                      size={20}
                      className="text-success"
                    />
                  ) : (
                    <ArrowUpRight
                      size={20}
                      className="text-danger"
                    />
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-foreground">
                    {transaction.title}
                  </h4>

                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded-full bg-tint px-2 py-1 text-xs text-muted-foreground">
                      {transaction.category}
                    </span>

                    <span className="text-xs text-faint">
                      {formatDateBR(String(transaction.transactionDate))}
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`text-lg font-semibold ${
                  income
                    ? "text-success"
                    : "text-danger"
                }`}
              >
                {income ? "+" : "-"}{" "}
                {transaction.amount.toLocaleString(
                  "pt-BR",
                  {
                    style: "currency",
                    currency: "BRL",
                  }
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}