"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none transition focus:border-violet-500";

type Props = {
  action: (formData: FormData) => Promise<void>;
};

export function AccountForm({ action }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      (document.getElementById("account-form") as HTMLFormElement)?.reset();
    });
  }

  return (
    <form
      id="account-form"
      action={handleSubmit}
      className="space-y-4 rounded-3xl border border-white/10 bg-[#111827] p-6"
    >
      <h2 className="text-xl font-semibold text-white">Nova Conta</h2>

      <input
        name="name"
        required
        placeholder="Nome da conta"
        className={inputClass}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <select name="type" className={`${inputClass} md:col-span-1`}>
          <option value="Conta Corrente">Conta Corrente</option>
          <option value="Poupança">Poupança</option>
          <option value="Carteira">Carteira</option>
          <option value="Investimento">Investimento</option>
        </select>

        <input
          type="color"
          name="color"
          defaultValue="#7C3AED"
          className="h-[50px] w-full cursor-pointer rounded-xl border border-white/10 bg-[#09090B] md:col-span-1"
        />

        <input
          type="number"
          step="0.01"
          name="initial_balance"
          defaultValue="0"
          placeholder="Saldo inicial"
          className={`${inputClass} md:col-span-1`}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Conta"}
      </Button>
    </form>
  );
}
