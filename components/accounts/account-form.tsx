"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";

const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelClass = "mb-1.5 block text-sm font-medium text-text-soft";

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function AccountForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await action(formData);
        formRef.current?.reset();
        toast.success("Conta criada.");
      } catch {
        setError("Não foi possível criar a conta. Confira os dados e tente de novo.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4 rounded-[22px] border border-line bg-surface p-6">
      <h2 className="text-xl font-semibold text-foreground">Nova conta</h2>

      <div>
        <label htmlFor="account-name" className={labelClass}>
          Nome da conta
        </label>
        <input id="account-name" name="name" required maxLength={60} placeholder="Ex.: Nubank, Carteira" className={inputClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_88px]">
        <div>
          <label htmlFor="account-type" className={labelClass}>
            Tipo
          </label>
          <select id="account-type" name="type" className={inputClass}>
            <option value="Conta Corrente">Conta corrente</option>
            <option value="Poupança">Poupança</option>
            <option value="Carteira">Carteira (dinheiro)</option>
            <option value="Investimento">Conta de investimento</option>
          </select>
        </div>

        <div>
          <label htmlFor="account-balance" className={labelClass}>
            Saldo de hoje
          </label>
          <MoneyInput
            id="account-balance"
            allowNegative
            prefix
            name="initial_balance"
            defaultValue={0}
            className={inputClass}
            aria-describedby="account-balance-hint"
          />
          <p id="account-balance-hint" className="mt-1.5 text-xs text-faint">
            Quanto tem na conta agora. Negativo (cheque especial)? Toque em ±.
          </p>
        </div>

        <div>
          <label htmlFor="account-color" className={labelClass}>
            Cor
          </label>
          <input
            id="account-color"
            type="color"
            name="color"
            defaultValue="#7C3AED"
            className="h-[50px] w-full cursor-pointer rounded-xl border border-line-strong bg-surface-solid"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="min-h-11 w-full">
        {isPending ? "Salvando..." : "Salvar conta"}
      </Button>
    </form>
  );
}
