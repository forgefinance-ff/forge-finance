"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createInvestmentAction } from "@/app/actions/investments";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";

const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelClass = "mb-1.5 block text-sm font-medium text-text-soft";

export function InvestmentForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createInvestmentAction(formData);
        formRef.current?.reset();
        toast.success("Investimento salvo.");
      } catch {
        setError("Não foi possível salvar o investimento. Confira os dados e tente de novo.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 rounded-[22px] border border-line bg-surface p-6">
      <h2 className="text-xl font-semibold text-foreground">Novo investimento</h2>

      <div>
        <label htmlFor="inv-name" className={labelClass}>
          Nome do investimento
        </label>
        <input id="inv-name" name="name" required maxLength={80} placeholder="Ex.: Tesouro Selic 2029" className={inputClass} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="inv-type" className={labelClass}>
            Tipo
          </label>
          <select id="inv-type" name="type" required className={inputClass}>
            <option value="Renda Fixa">Renda fixa</option>
            <option value="Renda Variável">Renda variável</option>
            <option value="Fundos">Fundos</option>
            <option value="Cripto">Cripto</option>
            <option value="Outros">Outros</option>
          </select>
        </div>
        <div>
          <label htmlFor="inv-institution" className={labelClass}>
            Onde está aplicado
          </label>
          <input id="inv-institution" name="institution" required maxLength={60} placeholder="Ex.: Nubank, XP" className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="inv-invested" className={labelClass}>
            Quanto você aplicou
          </label>
          <MoneyInput id="inv-invested" name="invested_amount" required prefix className={inputClass} />
        </div>
        <div>
          <label htmlFor="inv-current" className={labelClass}>
            Quanto vale hoje
          </label>
          <MoneyInput
            id="inv-current"
            name="current_amount"
            required
            prefix
            className={inputClass}
            aria-describedby="inv-current-hint"
          />
          <p id="inv-current-hint" className="mt-1 text-xs text-faint">
            Veja no app do banco ou da corretora.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="min-h-11 w-full">
        {isPending ? "Salvando..." : "Salvar investimento"}
      </Button>
    </form>
  );
}
