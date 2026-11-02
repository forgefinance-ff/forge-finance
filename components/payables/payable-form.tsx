"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createPayable, updatePayable } from "@/app/actions/payables";
import { inputClass } from "@/components/customers/customer-form";
import { Button } from "@/components/ui/button";
import type { Payable, PayableKind } from "@/lib/payables-shared";

export type Option = { id: string; name: string };
export type CategoryOption = Option & { type: "income" | "expense" };

type Props = {
  kind: PayableKind;
  payable?: Payable;
  accounts: Option[];
  categories: CategoryOption[];
  /** Só no escopo Empresa e em contas a receber. */
  customers: Option[] | null;
  today: string;
  onSuccess?: () => void;
};

const labelClass = "mb-2 block text-sm text-text-soft";

export function PayableForm({
  kind,
  payable,
  accounts,
  categories,
  customers,
  today,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const categoryType = kind === "payable" ? "expense" : "income";
  const kindCategories = categories.filter((c) => c.type === categoryType);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = payable ? await updatePayable(formData) : await createPayable(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(payable ? "Conta atualizada." : "Conta registrada.");
      onSuccess?.();
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
      noValidate
    >
      <input type="hidden" name="kind" value={kind} />
      {payable && <input type="hidden" name="id" value={payable.id} />}

      <div>
        <label htmlFor="payable-description" className={labelClass}>
          Descrição <span className="text-danger">*</span>
        </label>
        <input
          id="payable-description"
          name="description"
          required
          maxLength={120}
          defaultValue={payable?.description}
          placeholder={kind === "payable" ? "Ex.: Aluguel da sala" : "Ex.: Site institucional"}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="payable-amount" className={labelClass}>
            Valor (R$) <span className="text-danger">*</span>
          </label>
          <input
            id="payable-amount"
            name="amount"
            required
            inputMode="decimal"
            defaultValue={payable ? payable.amount.toFixed(2).replace(".", ",") : ""}
            placeholder="0,00"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="payable-due" className={labelClass}>
            Vencimento <span className="text-danger">*</span>
          </label>
          <input
            id="payable-due"
            name="due_date"
            type="date"
            required
            defaultValue={payable?.due_date ?? today}
            className={inputClass}
          />
        </div>
      </div>

      {customers && (
        <div>
          <label htmlFor="payable-customer" className={labelClass}>
            Cliente
          </label>
          <select
            id="payable-customer"
            name="customer_id"
            defaultValue={payable?.customer_id ?? ""}
            className={inputClass}
          >
            <option value="">Sem cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="payable-category" className={labelClass}>
            Categoria
          </label>
          <select
            id="payable-category"
            name="category_id"
            defaultValue={payable?.category_id ?? ""}
            className={inputClass}
          >
            <option value="">Sem categoria</option>
            {kindCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="payable-account" className={labelClass}>
            Conta prevista
          </label>
          <select
            id="payable-account"
            name="account_id"
            defaultValue={payable?.account_id ?? ""}
            className={inputClass}
          >
            <option value="">Escolher ao pagar</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="payable-recurrence" className={labelClass}>
          Repetição
        </label>
        <select
          id="payable-recurrence"
          name="recurrence"
          defaultValue={payable?.recurrence ?? "none"}
          className={inputClass}
        >
          <option value="none">Não se repete</option>
          <option value="monthly">Todo mês (gera a próxima ao pagar)</option>
        </select>
      </div>

      <div>
        <label htmlFor="payable-notes" className={labelClass}>
          Observações
        </label>
        <textarea
          id="payable-notes"
          name="notes"
          rows={2}
          maxLength={1000}
          defaultValue={payable?.notes ?? ""}
          className={`${inputClass} resize-y`}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando…" : payable ? "Salvar alterações" : "Registrar conta"}
      </Button>
    </form>
  );
}
