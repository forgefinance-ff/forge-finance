"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCustomer, updateCustomer } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/customers";
import { formatBrPhone } from "@/lib/phone";

export const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-4 py-3 text-foreground outline-none transition placeholder:text-faint focus:border-brand-bright/60 focus:ring-2 focus:ring-brand-bright/20";

type Props = {
  customer?: Customer;
  onSuccess?: () => void;
};

export function CustomerForm({ customer, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = customer
        ? await updateCustomer(formData)
        : await createCustomer(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success(customer ? "Cliente atualizado." : "Cliente cadastrado.");
      onSuccess?.();
    });
  }

  return (
    <form
      // onSubmit (e não action) para não limpar os campos quando há erro.
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(new FormData(event.currentTarget));
      }}
      className="space-y-4"
      noValidate
    >
      {customer && <input type="hidden" name="id" value={customer.id} />}

      <div>
        <label htmlFor="customer-name" className="mb-2 block text-sm text-text-soft">
          Nome <span className="text-danger">*</span>
        </label>
        <input
          id="customer-name"
          name="name"
          required
          maxLength={120}
          defaultValue={customer?.name}
          placeholder="Ex.: Maria Souza"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="customer-phone" className="mb-2 block text-sm text-text-soft">
            WhatsApp / telefone
          </label>
          <input
            id="customer-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={formatBrPhone(customer?.phone)}
            placeholder="(11) 91234-5678"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="customer-email" className="mb-2 block text-sm text-text-soft">
            E-mail
          </label>
          <input
            id="customer-email"
            name="email"
            type="email"
            inputMode="email"
            maxLength={160}
            defaultValue={customer?.email ?? ""}
            placeholder="cliente@email.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="customer-notes" className="mb-2 block text-sm text-text-soft">
          Observações
        </label>
        <textarea
          id="customer-notes"
          name="notes"
          rows={3}
          maxLength={1000}
          defaultValue={customer?.notes ?? ""}
          placeholder="Ex.: prefere receber cobrança à tarde"
          className={`${inputClass} resize-y`}
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando…" : customer ? "Salvar alterações" : "Cadastrar cliente"}
      </Button>
    </form>
  );
}
