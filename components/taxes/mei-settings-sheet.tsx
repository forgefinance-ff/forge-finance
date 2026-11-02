"use client";

import { useState, useTransition } from "react";
import { Settings2Icon } from "lucide-react";
import { toast } from "sonner";

import { saveMeiSettings } from "@/app/actions/mei";
import { inputClass } from "@/components/customers/customer-form";
import { GovNotice } from "@/components/mei/gov-notice";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ACTIVITY_LABEL, type MeiSettings } from "@/lib/mei-shared";
import { amountToInput } from "@/lib/money";

const labelClass = "mb-2 block text-sm text-text-soft";
const hintClass = "mt-1.5 text-xs text-faint";

type Props = {
  settings: MeiSettings | null;
  /** Abre o painel automaticamente (ex.: primeira visita). */
  label?: string;
  variant?: "default" | "outline";
};

export function MeiSettingsSheet({ settings, label = "Configurações do MEI", variant = "outline" }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await saveMeiSettings(formData);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      toast.success("Configurações do MEI salvas.");
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Settings2Icon className="h-4 w-4" />
        {label}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Configurações do MEI</SheetTitle>
            <SheetDescription>
              Usadas para o limite de faturamento, o DAS e o lembrete da declaração anual.
            </SheetDescription>
          </SheetHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit(new FormData(event.currentTarget));
            }}
            className="space-y-4 px-4 pb-6"
            noValidate
          >
            <GovNotice />

            <div>
              <label htmlFor="mei-activity" className={labelClass}>
                Atividade
              </label>
              <select
                id="mei-activity"
                name="activity"
                defaultValue={settings?.activity ?? "servicos"}
                className={inputClass}
              >
                {Object.entries(ACTIVITY_LABEL).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mei-limit" className={labelClass}>
                  Limite anual de faturamento (R$)
                </label>
                <input
                  id="mei-limit"
                  name="annual_limit"
                  inputMode="decimal"
                  defaultValue={amountToInput(settings?.annual_limit)}
                  placeholder="Conferir no gov.br"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="mei-das" className={labelClass}>
                  Valor mensal do DAS (R$)
                </label>
                <input
                  id="mei-das"
                  name="das_amount"
                  inputMode="decimal"
                  defaultValue={amountToInput(settings?.das_amount)}
                  placeholder="Conferir no gov.br"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="mei-due-day" className={labelClass}>
                  Dia de vencimento do DAS
                </label>
                <input
                  id="mei-due-day"
                  name="das_due_day"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={settings?.das_due_day ?? 20}
                  className={inputClass}
                />
                <p className={hintClass}>Vencimento no mês seguinte à competência.</p>
              </div>

              <div>
                <label htmlFor="mei-opening" className={labelClass}>
                  Data de abertura do MEI
                </label>
                <input
                  id="mei-opening"
                  name="opening_date"
                  type="date"
                  defaultValue={settings?.opening_date ?? ""}
                  className={inputClass}
                />
                <p className={hintClass}>Opcional. Se for deste ano, o limite fica proporcional.</p>
              </div>
            </div>

            <div>
              <label htmlFor="mei-dasn" className={labelClass}>
                Prazo da Declaração Anual (DASN-SIMEI)
              </label>
              <input
                id="mei-dasn"
                name="dasn_due_date"
                type="date"
                defaultValue={settings?.dasn_due_date ?? ""}
                className={inputClass}
              />
              <p className={hintClass}>Confira o prazo do ano no Portal do Empreendedor.</p>
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
              {isPending ? "Salvando…" : "Salvar configurações"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
