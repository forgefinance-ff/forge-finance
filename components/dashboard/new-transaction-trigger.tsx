"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { transferBetweenAccounts, type ActionResult } from "@/app/actions/transactions";

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
import type { Card } from "@/lib/cards";
import type { Category } from "@/lib/categories";

type Props = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  accounts: Account[];
  categories: Category[];
  cards?: Card[];
  label?: string;
  className?: string;
};

export function NewTransactionTrigger({
  action,
  accounts,
  categories,
  cards = [],
  label = "Nova Transação",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        className={className ?? "rounded-xl"}
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-4 w-4" aria-hidden />
        {label}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>Nova transação</SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <TransactionForm
              bare
              action={action}
              transferAction={transferBetweenAccounts}
              accounts={accounts}
              categories={categories}
              cards={cards}
              onSuccess={() => {
                setOpen(false);
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
