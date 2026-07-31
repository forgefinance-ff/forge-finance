"use client";

import { useState } from "react";

import { TransactionForm } from "@/components/transactions/transaction-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Account } from "@/lib/accounts";
import type { Category } from "@/lib/categories";

type Props = {
  action: (formData: FormData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  label?: string;
  className?: string;
};

export function NewTransactionTrigger({
  action,
  accounts,
  categories,
  label = "Nova Transação",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        className={className ?? "rounded-xl"}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>

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
              onSuccess={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
