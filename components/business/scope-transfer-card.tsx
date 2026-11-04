"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRightIcon } from "lucide-react";
import { toast } from "sonner";

import { createScopeTransfer } from "@/app/actions/business";
import { Button } from "@/components/ui/button";

import { brl } from "./format";

type Option = { id: string; name: string; balance: number };

type Props = {
  businessAccounts: Option[];
  personalAccounts: Option[];
  today: string;
};

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500";

const KINDS = {
  prolabore: {
    label: "Pró-labore",
    hint: "Seu “salário” como dono. Entra na DRE como despesa da empresa e como receita no Pessoal.",
    from: "business",
  },
  withdrawal: {
    label: "Retirada de lucros",
    hint: "Parte do lucro que você leva para casa. Não reduz o lucro na DRE, mas sai do caixa.",
    from: "business",
  },
  contribution: {
    label: "Aporte na empresa",
    hint: "Dinheiro seu colocado na empresa. Não é faturamento.",
    from: "personal",
  },
} as const;

type Kind = keyof typeof KINDS;

export function ScopeTransferCard({ businessAccounts, personalAccounts, today }: Props) {
  const [kind, setKind] = useState<Kind>("prolabore");
  const [isPending, startTransition] = useTransition();

  const fromBusiness = KINDS[kind].from === "business";
  const fromOptions = fromBusiness ? businessAccounts : personalAccounts;
  const toOptions = fromBusiness ? personalAccounts : businessAccounts;
  const missing = businessAccounts.length === 0 || personalAccounts.length === 0;

  function submit(form: HTMLFormElement) {
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createScopeTransfer(formData);
      if (result.ok) {
        toast.success(`${KINDS[kind].label} registrado nos dois lados.`);
        form.reset();
      } else toast.error(result.error);
    });
  }

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <ArrowLeftRightIcon className="h-5 w-5 text-brand-soft" />
        Seu dinheiro x dinheiro da empresa
      </h2>
      <p className="text-sm text-muted-foreground">
        Registre pró-labore, retiradas e aportes de uma vez: sai de uma conta e entra na outra,
        nos dois escopos. Apagar um lado apaga os dois.
      </p>

      {missing ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-4 text-sm text-muted-foreground">
          Você precisa de pelo menos uma conta Pessoal e uma da Empresa (em Contas, trocando o
          escopo no topo).
        </p>
      ) : (
        <form
          key={kind}
          onSubmit={(event) => {
            event.preventDefault();
            submit(event.currentTarget);
          }}
          className="mt-4 space-y-3"
        >
          <div role="radiogroup" aria-label="Tipo" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-tint p-1 text-xs sm:text-sm">
            {(Object.keys(KINDS) as Kind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-lg px-2 py-2 font-medium transition ${
                  kind === k ? "bg-brand/15 text-brand-soft" : "text-faint hover:text-text-soft"
                }`}
              >
                {KINDS[k].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-faint">{KINDS[kind].hint}</p>
          <input type="hidden" name="kind" value={kind} />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">
                Sai de ({fromBusiness ? "Empresa" : "Pessoal"})
              </span>
              <select name="from_account" required className={inputClass}>
                {fromOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {brl(a.balance)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">
                Entra em ({fromBusiness ? "Pessoal" : "Empresa"})
              </span>
              <select name="to_account" required className={inputClass}>
                {toOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {brl(a.balance)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">Valor (R$)</span>
              <input name="amount" required inputMode="decimal" placeholder="0,00" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">Data</span>
              <input name="date" type="date" required defaultValue={today} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-faint">Descrição (opcional)</span>
              <input name="description" maxLength={120} placeholder={KINDS[kind].label} className={inputClass} />
            </label>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Registrando…" : `Registrar ${KINDS[kind].label.toLowerCase()}`}
          </Button>
        </form>
      )}
    </section>
  );
}
