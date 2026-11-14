"use client";

import { useState, useTransition } from "react";
import { CheckIcon } from "lucide-react";

import { createCardAction } from "@/app/actions/cards";
import { BankCard } from "@/components/cards/bank-card";
import { Button } from "@/components/ui/button";
import { BANKS } from "@/lib/banks";
import { cn } from "@/lib/utils";
import { MoneyInput } from "@/components/ui/money-input";

const inputClass =
  "w-full rounded-lg border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/15";

export function CardForm() {
  const [isPending, startTransition] = useTransition();
  const [bankId, setBankId] = useState<string>("nubank");
  const [name, setName] = useState("Nubank");
  const [customColor, setCustomColor] = useState("#7C3AED");

  const bank = BANKS.find((b) => b.id === bankId) ?? null;
  const color = bank ? bank.color : customColor;

  function choose(id: string) {
    const next = BANKS.find((b) => b.id === id) ?? null;
    // Troca o nome só se ainda for o nome de um banco (não apaga um apelido digitado).
    const isBankName = name.trim() === "" || BANKS.some((b) => b.name === name.trim());
    setBankId(id);
    if (isBankName) setName(next ? next.name : "");
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createCardAction(formData);
      (document.getElementById("card-form") as HTMLFormElement)?.reset();
      setBankId("nubank");
      setName("Nubank");
    });
  }

  return (
    <form id="card-form" action={handleSubmit} className="space-y-6 rounded-[22px] border border-line bg-surface p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <fieldset>
            <legend className="mb-3 block text-sm text-text-soft">Banco do cartão</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {[...BANKS, null].map((item) => {
                const id = item?.id ?? "outro";
                const active = bankId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => choose(id)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex min-h-12 items-center gap-2 rounded-xl border px-2 py-2 text-left text-sm leading-tight transition-colors sm:gap-2.5 sm:px-2.5",
                      active
                        ? "border-text bg-tint-strong font-medium text-foreground"
                        : "border-line text-text-soft hover:border-line-strong hover:text-foreground"
                    )}
                  >
                    {item ? (
                      <BankCard name={item.name} color={item.color} size="mini" />
                    ) : (
                      <span
                        aria-hidden
                        className="aspect-[1.586] w-12 shrink-0 rounded-[6px] ring-1 ring-black/10"
                        style={{ background: `linear-gradient(135deg, ${customColor}, color-mix(in oklab, ${customColor} 60%, black))` }}
                      />
                    )}
                    <span className="line-clamp-2 min-w-0 flex-1 break-words">{item?.name ?? "Outro banco"}</span>
                    {active && (
                      <CheckIcon className="absolute right-1.5 top-1.5 h-3.5 w-3.5 shrink-0 sm:static sm:h-4 sm:w-4" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="card-name" className="mb-2 block text-sm text-text-soft">
                Nome do cartão
              </label>
              <input
                id="card-name"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={bank ? `Ex.: ${bank.name} Platinum` : "Ex.: Cartão da loja"}
                className={inputClass}
              />
            </div>

            {bank ? (
              <input type="hidden" name="color" value={color} />
            ) : (
              <div>
                <label htmlFor="card-color" className="mb-2 block text-sm text-text-soft">
                  Cor do cartão
                </label>
                <input
                  id="card-color"
                  type="color"
                  name="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="h-12 w-full rounded-lg border border-line-strong bg-surface-solid"
                />
              </div>
            )}

            <div>
              <label htmlFor="card-limit" className="mb-2 block text-sm text-text-soft">
                Limite
              </label>
              <MoneyInput id="card-limit" name="limit_amount" required className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="card-closing" className="mb-2 block text-sm text-text-soft">
                Dia do fechamento
              </label>
              <input id="card-closing" type="number" min={1} max={31} name="closing_day" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="card-due" className="mb-2 block text-sm text-text-soft">
                Dia do vencimento
              </label>
              <input id="card-due" type="number" min={1} max={31} name="due_day" required className={inputClass} />
            </div>
          </div>
        </div>

        <div className="lg:pt-8">
          <p className="mb-3 text-sm text-text-soft">Prévia</p>
          <div key={bankId} className="t-page-reveal">
            <BankCard name={name || bank?.name || "Seu cartão"} color={color} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cores aproximadas de cada banco, sem os logotipos oficiais.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar cartão"}
      </Button>
    </form>
  );
}
