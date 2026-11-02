"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, FilePlus2Icon, ReceiptTextIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { deleteDas, generateDas, payDas } from "@/app/actions/mei";
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
import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import {
  competenceLabel,
  isBeforeOpening,
  MONTHS_LONG,
  suggestedDasDueDate,
  type DasPayment,
  type MeiSettings,
} from "@/lib/mei-shared";
import { amountToInput } from "@/lib/money";
import { cn } from "@/lib/utils";

type Props = {
  year: number;
  today: string;
  payments: DasPayment[];
  settings: MeiSettings | null;
  accounts: Option[];
};

type Dialogs =
  | { type: "generate"; competence: string }
  | { type: "pay"; das: DasPayment }
  | null;

export function DasList({ year, today, payments, settings, accounts }: Props) {
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const byCompetence = new Map(payments.map((p) => [p.competence, p]));
  const currentCompetence = `${today.slice(0, 7)}-01`;
  const dueDay = settings?.das_due_day ?? 20;

  function close() {
    setDialog(null);
    setError(null);
  }

  function submitGenerate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await generateDas(formData);
      if (!result.ok) return setError(result.error);
      toast.success("DAS gerado.");
      close();
    });
  }

  function submitPay(das: DasPayment, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await payDas(
        das.id,
        String(formData.get("account_id") ?? ""),
        String(formData.get("paid_at") ?? "")
      );
      if (!result.ok) return setError(result.error);
      toast.success("DAS pago! Despesa registrada em Impostos.");
      close();
    });
  }

  function remove(das: DasPayment) {
    startTransition(async () => {
      const result = await deleteDas(das.id);
      if (result.ok) toast.success("Guia removida.");
      else toast.error(result.error);
    });
  }

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <ReceiptTextIcon className="h-5 w-5 text-brand-soft" />
        DAS de {year}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Gere a guia de cada competência e marque quando pagar. O pagamento vira uma despesa em
        “Impostos” na conta da empresa.
      </p>

      <ul className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {Array.from({ length: 12 }, (_, i) => {
          const competence = `${year}-${String(i + 1).padStart(2, "0")}-01`;
          const das = byCompetence.get(competence);
          const future = competence > currentCompetence;
          const beforeOpening = isBeforeOpening(competence, settings?.opening_date ?? null);

          return (
            <li
              key={competence}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium capitalize text-foreground">
                  {MONTHS_LONG[i]} <span className="text-faint">/ {year}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {das ? (
                    <>
                      {formatCurrency(das.amount)} · vence em {formatDateBR(das.due_date)}
                      {das.status === "paid" && das.paid_at && ` · pago em ${formatDateBR(das.paid_at)}`}
                    </>
                  ) : beforeOpening ? (
                    "Antes da abertura do MEI"
                  ) : future ? (
                    "Competência futura"
                  ) : (
                    "Guia não gerada"
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <DasStatus das={das} today={today} />

                {das?.status === "pending" && (
                  <>
                    <Button size="sm" onClick={() => setDialog({ type: "pay", das })}>
                      <CheckCircle2Icon className="h-4 w-4" />
                      Pagar
                    </Button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => remove(das)}
                      aria-label={`Remover DAS de ${competenceLabel(competence)}`}
                      title="Remover guia"
                      className="rounded-lg p-2 text-faint transition hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </button>
                  </>
                )}

                {!das && !future && !beforeOpening && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ type: "generate", competence })}
                  >
                    <FilePlus2Icon className="h-4 w-4" />
                    Gerar
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          {dialog?.type === "generate" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitGenerate(new FormData(event.currentTarget));
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Gerar DAS de {competenceLabel(dialog.competence)}</DialogTitle>
                <DialogDescription>
                  Confira o valor da guia no Portal do Empreendedor antes de salvar.
                </DialogDescription>
              </DialogHeader>

              <input type="hidden" name="competence" value={dialog.competence} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="das-amount" className="mb-2 block text-sm text-text-soft">
                    Valor (R$)
                  </label>
                  <input
                    id="das-amount"
                    name="amount"
                    inputMode="decimal"
                    required
                    defaultValue={amountToInput(settings?.das_amount)}
                    placeholder="0,00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="das-due" className="mb-2 block text-sm text-text-soft">
                    Vencimento
                  </label>
                  <input
                    id="das-due"
                    name="due_date"
                    type="date"
                    required
                    defaultValue={suggestedDasDueDate(dialog.competence, dueDay)}
                    className={inputClass}
                  />
                </div>
              </div>

              <DialogError error={error} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Gerando…" : "Gerar guia"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {dialog?.type === "pay" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitPay(dialog.das, new FormData(event.currentTarget));
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Pagar DAS de {competenceLabel(dialog.das.competence)}</DialogTitle>
                <DialogDescription>
                  {formatCurrency(dialog.das.amount)} — será criada uma despesa em “Impostos” na conta
                  escolhida e o saldo será ajustado.
                </DialogDescription>
              </DialogHeader>

              {accounts.length === 0 ? (
                <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                  Crie uma conta da empresa em Contas para registrar o pagamento.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="das-account" className="mb-2 block text-sm text-text-soft">
                      Pago com
                    </label>
                    <select id="das-account" name="account_id" className={inputClass}>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="das-paid" className="mb-2 block text-sm text-text-soft">
                      Data
                    </label>
                    <input
                      id="das-paid"
                      name="paid_at"
                      type="date"
                      required
                      defaultValue={today}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <DialogError error={error} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending || accounts.length === 0}>
                  {isPending ? "Registrando…" : "Confirmar pagamento"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DialogError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
      {error}
    </p>
  );
}

function DasStatus({ das, today }: { das?: DasPayment; today: string }) {
  if (!das) return null;

  const base = "rounded-full border px-2.5 py-0.5 text-xs font-semibold";

  if (das.status === "paid") {
    return <span className={cn(base, "border-success/40 bg-success/10 text-success")}>Pago</span>;
  }
  if (das.due_date < today) {
    return <span className={cn(base, "border-danger/40 bg-danger/10 text-danger")}>Atrasado</span>;
  }
  if (das.due_date === today) {
    return <span className={cn(base, "border-warning/40 bg-warning/10 text-warning")}>Vence hoje</span>;
  }
  return <span className={cn(base, "border-line bg-tint text-text-soft")}>Pendente</span>;
}
