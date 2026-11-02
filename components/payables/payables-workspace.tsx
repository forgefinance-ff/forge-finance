"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  AlertTriangleIcon,
  BanIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  ReceiptTextIcon,
  RepeatIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { cancelPayable, deletePayable } from "@/app/actions/payables";
import { inputClass } from "@/components/customers/customer-form";
import { EmptyState } from "@/components/mei/empty-state";
import { ChargeDialog } from "@/components/payables/charge-dialog";
import {
  PayableForm,
  type CategoryOption,
  type Option,
} from "@/components/payables/payable-form";
import { SettleDialog } from "@/components/payables/settle-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import {
  dueBadge,
  KIND_LABEL,
  STATUS_FILTERS,
  type Payable,
  type PayableKind,
  type StatusFilter,
} from "@/lib/payables-shared";
import { cn } from "@/lib/utils";

type Props = {
  kind: PayableKind;
  status: StatusFilter;
  from: string | null;
  to: string | null;
  payables: Payable[];
  accounts: Option[];
  categories: CategoryOption[];
  /** null no escopo Pessoal (clientes só existem na Empresa). */
  customers: Option[] | null;
  today: string;
};

type Confirm = { type: "cancel" | "delete"; payable: Payable } | null;

export function PayablesWorkspace({
  kind,
  status,
  from,
  to,
  payables,
  accounts,
  categories,
  customers,
  today,
}: Props) {
  const [editing, setEditing] = useState<Payable | "new" | null>(null);
  const [settling, setSettling] = useState<Payable | null>(null);
  const [charging, setCharging] = useState<Payable | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [isPending, startTransition] = useTransition();

  const isReceivable = kind === "receivable";
  const pending = payables.filter((p) => p.status === "pending");
  const overdue = pending.filter((p) => p.due_date < today);
  const dueToday = pending.filter((p) => p.due_date === today);
  const sum = (list: Payable[]) => list.reduce((total, p) => total + p.amount, 0);
  const hasFilters = status !== "pendentes" || !!from || !!to;

  function runConfirm() {
    if (!confirm) return;
    const { type, payable } = confirm;

    startTransition(async () => {
      const result =
        type === "cancel" ? await cancelPayable(payable.id) : await deletePayable(payable.id);

      if (result.ok) {
        toast.success(type === "cancel" ? "Conta cancelada." : "Conta excluída.");
        setConfirm(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Abas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav
          aria-label="Tipo de conta"
          className="flex w-full rounded-full border border-line bg-tint p-1 text-sm sm:w-auto"
        >
          {(["payable", "receivable"] as const).map((value) => (
            <Link
              key={value}
              href={`/contas-a-pagar-receber?aba=${value === "payable" ? "pagar" : "receber"}`}
              aria-current={kind === value ? "page" : undefined}
              className={cn(
                "flex-1 rounded-full px-4 py-2 text-center font-medium transition sm:flex-none",
                kind === value ? "bg-brand/15 text-brand-soft" : "text-faint hover:text-text-soft"
              )}
            >
              {KIND_LABEL[value].tab}
            </Link>
          ))}
        </nav>

        <Button onClick={() => setEditing("new")}>
          <PlusIcon className="h-4 w-4" />
          {isReceivable ? "Nova conta a receber" : "Nova conta a pagar"}
        </Button>
      </div>

      {/* Filtros (GET: o link fica compartilhável e o filtro roda no servidor) */}
      <form
        method="get"
        action="/contas-a-pagar-receber"
        className="grid gap-3 rounded-[22px] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
      >
        <input type="hidden" name="aba" value={isReceivable ? "receber" : "pagar"} />

        <div>
          <label htmlFor="filter-status" className="mb-1.5 block text-xs font-medium text-faint">
            Status
          </label>
          <select id="filter-status" name="status" defaultValue={status} className={inputClass}>
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-from" className="mb-1.5 block text-xs font-medium text-faint">
            Vencimento de
          </label>
          <input id="filter-from" name="de" type="date" defaultValue={from ?? ""} className={inputClass} />
        </div>

        <div>
          <label htmlFor="filter-to" className="mb-1.5 block text-xs font-medium text-faint">
            até
          </label>
          <input id="filter-to" name="ate" type="date" defaultValue={to ?? ""} className={inputClass} />
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit" variant="outline" className="h-[50px] flex-1 lg:flex-none">
            Filtrar
          </Button>
          {hasFilters && (
            <Link
              href={`/contas-a-pagar-receber?aba=${isReceivable ? "receber" : "pagar"}`}
              className="flex h-[50px] items-center rounded-xl px-3 text-sm text-faint transition hover:text-text-soft"
            >
              Limpar
            </Link>
          )}
        </div>
      </form>

      {/* Resumo */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label={isReceivable ? "Pendente a receber" : "Pendente a pagar"}
          value={formatCurrency(sum(pending))}
          hint={`${pending.length} ${pending.length === 1 ? "conta" : "contas"} no filtro`}
          icon={CalendarClockIcon}
        />
        <SummaryCard
          label="Em atraso"
          value={formatCurrency(sum(overdue))}
          hint={`${overdue.length} ${overdue.length === 1 ? "conta atrasada" : "contas atrasadas"}`}
          icon={AlertTriangleIcon}
          tone={overdue.length ? "danger" : undefined}
        />
        <SummaryCard
          label="Vence hoje"
          value={formatCurrency(sum(dueToday))}
          hint={`${dueToday.length} ${dueToday.length === 1 ? "conta" : "contas"}`}
          icon={CalendarClockIcon}
          tone={dueToday.length ? "warning" : undefined}
        />
      </div>

      {/* Lista */}
      {payables.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={ReceiptTextIcon}
            title="Nada encontrado com esses filtros"
            description="Tente outro status ou outro período de vencimento."
          >
            <Link
              href={`/contas-a-pagar-receber?aba=${isReceivable ? "receber" : "pagar"}`}
              className="text-sm font-medium text-brand-soft hover:underline"
            >
              Limpar filtros
            </Link>
          </EmptyState>
        ) : (
          <EmptyState
            icon={ReceiptTextIcon}
            title={isReceivable ? "Nenhuma conta a receber" : "Nenhuma conta a pagar"}
            description={
              isReceivable
                ? "Registre o que seus clientes vão te pagar e acompanhe os vencimentos sem planilha."
                : "Registre boletos, aluguel e fornecedores para nunca mais pagar juros por esquecimento."
            }
          >
            <Button onClick={() => setEditing("new")}>
              <PlusIcon className="h-4 w-4" />
              Registrar a primeira
            </Button>
          </EmptyState>
        )
      ) : (
        <ul className="space-y-3">
          {payables.map((payable) => {
            const badge = dueBadge(payable, today);
            const canCharge =
              isReceivable && payable.status === "pending" && !!payable.customer_phone;

            return (
              <li
                key={payable.id}
                className={cn(
                  "rounded-[22px] border bg-surface p-4 transition sm:p-5",
                  badge === "overdue" ? "border-danger/40" : "border-line hover:border-line-strong",
                  payable.status === "canceled" && "opacity-70"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{payable.description}</h3>
                      <StatusPill payable={payable} badge={badge} />
                      {payable.recurrence === "monthly" && (
                        <span
                          title="Repete todo mês"
                          className="inline-flex items-center gap-1 rounded-full border border-line bg-tint px-2 py-0.5 text-[11px] font-medium text-text-soft"
                        >
                          <RepeatIcon className="h-3 w-3" />
                          Mensal
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {payable.status === "paid" && payable.paid_at
                        ? `${KIND_LABEL[payable.kind].paid} em ${formatDateBR(payable.paid_at)}`
                        : `Vence em ${formatDateBR(payable.due_date)}`}
                      {[payable.customer_name, payable.category_name, payable.account_name]
                        .filter(Boolean)
                        .map((part) => ` · ${part}`)
                        .join("")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={cn(
                        "text-lg font-semibold tabular-nums",
                        isReceivable ? "text-success" : "text-foreground"
                      )}
                    >
                      {formatCurrency(payable.amount)}
                    </span>

                    <div className="flex items-center gap-1">
                      {payable.status === "pending" && (
                        <Button size="sm" onClick={() => setSettling(payable)}>
                          <CheckCircle2Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            {isReceivable ? "Recebida" : "Paga"}
                          </span>
                        </Button>
                      )}
                      {canCharge && (
                        <IconButton
                          label={`Cobrar ${payable.customer_name} pelo WhatsApp`}
                          onClick={() => setCharging(payable)}
                          className="hover:bg-success/10 hover:text-success"
                        >
                          <MessageCircleIcon className="h-4 w-4" />
                        </IconButton>
                      )}
                      {payable.status === "pending" && (
                        <>
                          <IconButton label="Editar" onClick={() => setEditing(payable)}>
                            <PencilIcon className="h-4 w-4" />
                          </IconButton>
                          <IconButton
                            label="Cancelar conta"
                            onClick={() => setConfirm({ type: "cancel", payable })}
                          >
                            <BanIcon className="h-4 w-4" />
                          </IconButton>
                        </>
                      )}
                      {payable.status !== "paid" && (
                        <IconButton
                          label="Excluir"
                          onClick={() => setConfirm({ type: "delete", payable })}
                          className="hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </IconButton>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editing === "new"
                ? isReceivable
                  ? "Nova conta a receber"
                  : "Nova conta a pagar"
                : "Editar conta"}
            </SheetTitle>
            <SheetDescription>
              Ao marcar como {isReceivable ? "recebida" : "paga"}, o app cria a transação e
              ajusta o saldo da conta.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
            {editing !== null && (
              <PayableForm
                key={editing === "new" ? "new" : editing.id}
                kind={kind}
                payable={editing === "new" ? undefined : editing}
                accounts={accounts}
                categories={categories}
                customers={isReceivable ? customers : null}
                today={today}
                onSuccess={() => setEditing(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <SettleDialog
        payable={settling}
        accounts={accounts}
        today={today}
        onClose={() => setSettling(null)}
      />

      <ChargeDialog payable={charging} today={today} onClose={() => setCharging(null)} />

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "cancel" ? "Cancelar" : "Excluir"} “{confirm?.payable.description}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "cancel"
                ? "A conta continua no histórico como cancelada e não gera transação."
                : "A conta será apagada de vez. Nenhuma transação é afetada."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={runConfirm}>
              {isPending ? "Aguarde…" : confirm?.type === "cancel" ? "Cancelar conta" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "danger" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border bg-surface p-5",
        tone === "danger" ? "border-danger/40" : tone === "warning" ? "border-warning/40" : "border-line"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-faint"
          )}
        />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-faint">{hint}</p>
    </div>
  );
}

function StatusPill({ payable, badge }: { payable: Payable; badge: ReturnType<typeof dueBadge> }) {
  const base = "rounded-full border px-2 py-0.5 text-[11px] font-semibold";

  if (badge === "overdue") {
    return <span className={cn(base, "border-danger/40 bg-danger/10 text-danger")}>Atrasado</span>;
  }
  if (badge === "today") {
    return <span className={cn(base, "border-warning/40 bg-warning/10 text-warning")}>Vence hoje</span>;
  }
  if (payable.status === "paid") {
    return (
      <span className={cn(base, "border-success/40 bg-success/10 text-success")}>
        {KIND_LABEL[payable.kind].paid}
      </span>
    );
  }
  if (payable.status === "canceled") {
    return <span className={cn(base, "border-line bg-tint text-faint")}>Cancelada</span>;
  }
  return null;
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "rounded-lg p-2 text-faint transition hover:bg-brand/10 hover:text-brand-soft",
        className
      )}
    >
      {children}
    </button>
  );
}
