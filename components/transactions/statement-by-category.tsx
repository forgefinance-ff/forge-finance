"use client";

import type { getTransactions } from "@/lib/transactions";
import { CARD_PAYMENT_KIND, kindTypeLabel, type MovementKind } from "@/lib/movement-kinds";

type Props = {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
  type: "income" | "expense";
};

type Row = {
  key: string;
  name: string;
  icon: string;
  label: string;
  total: number;
  count: number;
};

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Extrato de entradas OU de saídas, somado por categoria. Uma categoria com o
 * mesmo nome nos dois lados (ex.: "Outros") nunca se mistura: aqui só entra o
 * lado escolhido, e a chave é a categoria + o tipo.
 */
export function StatementByCategory({ transactions, type }: Props) {
  const rows = new Map<string, Row>();
  let total = 0;

  for (const transaction of transactions) {
    if (transaction.type !== type) continue;

    const value = Number(transaction.amount);
    const isInvoicePayment = transaction.kind === CARD_PAYMENT_KIND;
    const name: string = isInvoicePayment
      ? "Pagamento de fatura"
      : transaction.categories?.name ?? "Sem categoria";
    const kind = (transaction.kind ?? "regular") as MovementKind;
    const key = isInvoicePayment ? `card_payment:${type}` : `${transaction.category_id ?? "none"}:${type}`;

    const row = rows.get(key) ?? {
      key,
      name,
      icon: isInvoicePayment ? "💳" : transaction.categories?.icon ?? "📁",
      label: isInvoicePayment ? "Não é despesa · só sai da conta" : kindTypeLabel(kind, type),
      total: 0,
      count: 0,
    };

    row.total += value;
    row.count += 1;
    rows.set(key, row);
    total += value;
  }

  const list = [...rows.values()].sort((a, b) => b.total - a.total);
  const isIncome = type === "income";

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isIncome ? "Extrato de entradas" : "Extrato de saídas"} por categoria
          </h2>
          <p className="text-sm text-muted-foreground">
            Respeita os filtros abaixo (busca e data).
          </p>
        </div>
        <p className={`text-2xl font-bold tabular-nums ${isIncome ? "text-success" : "text-danger"}`}>
          {isIncome ? "+" : "−"} {brl(total)}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="mt-5 text-sm text-faint">
          Nenhuma {isIncome ? "entrada" : "saída"} encontrada com esses filtros.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((row) => {
            const pct = total > 0 ? (row.total / total) * 100 : 0;

            return (
              <li key={row.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span>{row.icon}</span>
                    <span className="truncate font-medium text-foreground">{row.name}</span>
                    <span className="shrink-0 text-xs text-faint">
                      {row.label} · {row.count} {row.count === 1 ? "lançamento" : "lançamentos"}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-text-soft">{brl(row.total)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint">
                  <div
                    className={`h-full rounded-full ${
                      isIncome
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
                        : "bg-gradient-to-r from-rose-500 to-rose-300"
                    }`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
