"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NEW_TRANSACTION_EVENT, NEW_TRANSACTION_PARAM } from "@/lib/quick-actions";

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

  // Atalho "Registrar transação" da barra lateral: abre aqui se esta página
  // tem o formulário; o primeiro que atender marca o evento como resolvido.
  useEffect(() => {
    function onNew(event: Event) {
      if (event.defaultPrevented) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener(NEW_TRANSACTION_EVENT, onNew);

    // Vindo de outra página com ?nova=1: abre e limpa o endereço.
    const url = new URL(window.location.href);
    if (url.searchParams.get(NEW_TRANSACTION_PARAM) === "1") {
      url.searchParams.delete(NEW_TRANSACTION_PARAM);
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    }

    return () => window.removeEventListener(NEW_TRANSACTION_EVENT, onNew);
  }, []);

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
