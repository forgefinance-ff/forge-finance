"use client";

import { useMemo, useState } from "react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsHeader } from "@/components/transactions/transactions-header";
import {
  TransactionsFilters,
  type TransactionTypeFilter,
} from "@/components/transactions/transactions-filters";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { TransactionsSummary } from "@/components/transactions/transactions-summary";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";

type Props = {
  transactions: any[];
  accounts: Account[];
  categories: Category[];
  createAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function TransactionsWorkspace({
  transactions,
  accounts,
  categories,
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
        } ${transaction.accounts?.name ?? ""}`.toLowerCase();

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

      <TransactionsSummary transactions={filtered} />

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
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
