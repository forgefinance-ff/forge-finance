"use client";

import { useState } from "react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionsHeader } from "@/components/transactions/transactions-header";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";

type Props = {
  action: (formData: FormData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
};

export function NewTransactionSheet({
  action,
  accounts,
  categories,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TransactionsHeader onNewTransaction={() => setOpen(true)} />

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
              action={action}
              accounts={accounts}
              categories={categories}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}