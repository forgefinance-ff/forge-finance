"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { payCardInvoiceAction } from "@/app/actions/cards";
import { Button } from "@/components/ui/button";

type Props = {
  cardId: string;
  accounts: { id: string; name: string }[];
  defaultAmount: number;
  today: string;
  label: string;
};

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500";

/** Paga a fatura (total ou parcial) a partir de uma conta. */
export function PayInvoiceForm({ cardId, accounts, defaultAmount, today, label }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (accounts.length === 0) {
    return <p className="text-xs text-muted-foreground">Cadastre uma conta para pagar a fatura.</p>;
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await payCardInvoiceAction(formData);
      if (result.ok) {
        toast.success("Pagamento da fatura registrado. Ele sai da conta, mas não conta como despesa.");
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={submit} className="grid gap-2 rounded-2xl border border-line bg-tint p-3 sm:grid-cols-[1fr_130px_150px_auto] sm:items-end">
      <input type="hidden" name="card_id" value={cardId} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-faint">Pagar com a conta</span>
        <select name="account_id" required className={inputClass} defaultValue={accounts[0].id}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-faint">Valor</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={defaultAmount > 0 ? defaultAmount.toFixed(2) : ""}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-faint">Data</span>
        <input name="date" type="date" required defaultValue={today} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Confirmar"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
