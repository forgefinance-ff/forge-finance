"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { settlePayable } from "@/app/actions/payables";
import { inputClass } from "@/components/customers/customer-form";
import type { Option } from "@/components/payables/payable-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/formatters";
import { KIND_LABEL, type Payable } from "@/lib/payables-shared";

type Props = {
  payable: Payable | null;
  accounts: Option[];
  today: string;
  onClose: () => void;
};

/** Pede conta e data; cria a transação e ajusta o saldo (no banco, atômico). */
export function SettleDialog({ payable, accounts, today, onClose }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isReceivable = payable?.kind === "receivable";

  function handleSubmit(formData: FormData) {
    if (!payable) return;
    setError(null);

    startTransition(async () => {
      const result = await settlePayable(
        payable.id,
        String(formData.get("account_id") ?? ""),
        String(formData.get("paid_at") ?? "")
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(
        payable.recurrence === "monthly"
          ? `${KIND_LABEL[payable.kind].paid}! A próxima do mês seguinte já foi criada.`
          : `${KIND_LABEL[payable.kind].paid}! Transação registrada.`
      );
      onClose();
    });
  }

  return (
    <Dialog open={payable !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {payable && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit(new FormData(event.currentTarget));
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>{KIND_LABEL[payable.kind].action}</DialogTitle>
              <DialogDescription>
                {payable.description} — {formatCurrency(payable.amount)}. Será criada uma{" "}
                {isReceivable ? "receita" : "despesa"} na conta escolhida e o saldo será
                ajustado.
              </DialogDescription>
            </DialogHeader>

            {accounts.length === 0 ? (
              <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                Você ainda não tem contas neste escopo. Crie uma em Contas para registrar o
                pagamento.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="settle-account" className="mb-2 block text-sm text-text-soft">
                    {isReceivable ? "Recebido em" : "Pago com"}
                  </label>
                  <select
                    id="settle-account"
                    name="account_id"
                    required
                    defaultValue={payable.account_id ?? accounts[0]?.id}
                    className={inputClass}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="settle-date" className="mb-2 block text-sm text-text-soft">
                    Data
                  </label>
                  <input
                    id="settle-date"
                    name="paid_at"
                    type="date"
                    required
                    defaultValue={today}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || accounts.length === 0}>
                {isPending ? "Registrando…" : "Confirmar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
