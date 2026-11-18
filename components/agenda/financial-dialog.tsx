"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { settlePayable } from "@/app/actions/payables";
import { inputClass } from "@/components/customers/customer-form";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FINANCIAL_KIND_LABEL,
  FINANCIAL_STATUS_LABEL,
  type FinancialItem,
} from "@/lib/agenda/shared";
import { longDate } from "@/lib/agenda/time";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import type { AccountOption } from "./agenda-workspace";

const STATUS_CLASS: Record<FinancialItem["status"], string> = {
  pending: "border-warning/40 bg-warning/10 text-warning",
  paid: "border-success/40 bg-success/10 text-success",
  overdue: "border-danger/40 bg-danger/10 text-danger",
};

/** Item financeiro na agenda: detalhes e "dar baixa" sem sair da tela. */
export function FinancialDialog({
  item,
  accounts,
  today,
  onClose,
  onSettled,
}: {
  item: FinancialItem | null;
  accounts: AccountOption[];
  today: string;
  onClose: () => void;
  onSettled: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [forId, setForId] = useState<string | null>(null);
  if ((item?.id ?? null) !== forId) {
    setForId(item?.id ?? null);
    setError(null);
  }

  const canSettle = item?.source === "payable" && item.payableId && item.status !== "paid";
  const scopeAccounts = item ? accounts.filter((a) => a.scope === item.scope) : [];
  const receive = item?.kind === "receive";

  function settle(formData: FormData) {
    if (!item?.payableId) return;
    setError(null);
    startTransition(async () => {
      const result = await settlePayable(
        item.payableId!,
        String(formData.get("account_id") ?? ""),
        String(formData.get("paid_at") ?? "")
      );
      if (!result.ok) return setError(result.error);
      toast.success(receive ? "Recebimento registrado." : "Pagamento registrado.");
      onSettled();
      onClose();
    });
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {item && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              settle(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">
                {FINANCIAL_KIND_LABEL[item.kind]} · {item.scope === "business" ? "Empresa" : "Pessoal"}
              </p>
              <DialogTitle>{item.title}</DialogTitle>
              <DialogDescription>
                {item.source === "das-next"
                  ? `Vence em ${longDate(item.date)}. A guia ainda não foi gerada no Forge.`
                  : item.source === "dasn"
                    ? `Prazo em ${longDate(item.date)}.`
                    : `Vence em ${longDate(item.date)}.`}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap items-center gap-3">
              {item.amount !== null && (
                <p
                  className={cn(
                    "text-3xl font-semibold tracking-tight",
                    item.kind === "receive" ? "text-success" : "text-foreground"
                  )}
                >
                  {formatCurrency(item.amount)}
                </p>
              )}
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", STATUS_CLASS[item.status])}>
                {FINANCIAL_STATUS_LABEL[item.status]}
              </span>
            </div>
            {item.customer && <p className="text-sm text-muted-foreground">Cliente: {item.customer}</p>}

            {canSettle &&
              (scopeAccounts.length === 0 ? (
                <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                  Crie uma conta em {item.scope === "business" ? "Empresa" : "Pessoal"} para registrar o{" "}
                  {receive ? "recebimento" : "pagamento"}.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-line p-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fin-account" className="mb-2 block text-sm text-text-soft">
                      {receive ? "Recebido em" : "Pago com"}
                    </label>
                    <select id="fin-account" name="account_id" required className={inputClass}>
                      {scopeAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fin-date" className="mb-2 block text-sm text-text-soft">
                      Data
                    </label>
                    <input id="fin-date" name="paid_at" type="date" required defaultValue={today} className={inputClass} />
                  </div>
                </div>
              ))}

            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}

            <DialogFooter className="gap-2 sm:justify-between">
              <Link href={item.href} className={buttonVariants({ variant: "ghost" })}>
                {item.source === "payable" ? "Abrir em A pagar e receber" : "Abrir Impostos"}
              </Link>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                  Fechar
                </Button>
                {canSettle && scopeAccounts.length > 0 && (
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Registrando…" : receive ? "Dar baixa (recebido)" : "Dar baixa (pago)"}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
