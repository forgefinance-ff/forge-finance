"use client";
import type { getTransactions } from "@/lib/transactions";

import { useMemo, useState } from "react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsHeader } from "@/components/transactions/transactions-header";
import {
  TransactionsFilters,
  type TransactionTypeFilter,
} from "@/components/transactions/transactions-filters";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { TransactionsSummary } from "@/components/transactions/transactions-summary";
import { StatementByCategory } from "@/components/transactions/statement-by-category";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Account } from "@/lib/accounts";
import type { Card } from "@/lib/cards";
import type { Category } from "@/lib/categories";

type Props = {
  transactions: Awaited<ReturnType<typeof getTransactions>>;
  accounts: Account[];
  categories: Category[];
  cards?: Card[];
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function TransactionsWorkspace({
  transactions,
  accounts,
  categories,
  cards = [],
  createAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<TransactionTypeFilter>("all");
  const [date, setDate] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      if (type !== "all" && transaction.type !== type) return false;

      if (date && transaction.transaction_date?.slice(0, 10) !== date) {
        return false;
      }

      if (search) {
        const haystack = `${transaction.description ?? ""} ${
          transaction.categories?.name ?? ""
        } ${transaction.accounts?.name ?? ""} ${transaction.cards?.name ?? ""}`.toLowerCase();

        if (!haystack.includes(search.toLowerCase())) return false;
      }

      return true;
    });
  }, [transactions, search, type, date]);

  function resetFilters() {
    setSearch("");
    setType("all");
    setDate("");
  }

  return (
    <div className="space-y-8">
      <TransactionsHeader onNewTransaction={() => setOpen(true)} />

      <nav
        aria-label="Extrato"
        className="flex w-full flex-wrap gap-1 rounded-2xl border border-line bg-tint p-1 text-sm sm:w-fit"
      >
        {(
          [
            { value: "all", label: "Todas" },
            { value: "income", label: "Extrato de entradas" },
            { value: "expense", label: "Extrato de saídas" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={type === tab.value}
            onClick={() => setType(tab.value)}
            className={`flex-1 rounded-xl px-4 py-2 font-medium transition sm:flex-none ${
              type === tab.value
                ? "bg-brand/15 text-brand-soft"
                : "text-faint hover:text-text-soft"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {type === "all" ? (
        <TransactionsSummary transactions={filtered} />
      ) : (
        <StatementByCategory transactions={filtered} type={type} />
      )}

      <TransactionsFilters
        search={search}
        onSearchChange={setSearch}
        type={type}
        onTypeChange={setType}
        date={date}
        onDateChange={setDate}
        onReset={resetFilters}
      />

      <TransactionsList
        transactions={filtered}
        deleteAction={deleteAction}
        hasAnyTransactions={transactions.length > 0}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Nova Transação</SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <TransactionForm
              action={createAction}
              accounts={accounts}
              categories={categories}
              cards={cards}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
