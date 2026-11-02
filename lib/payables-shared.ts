/** Tipos e regras de contas a pagar/receber usados no servidor e na tela. */
import type { Scope } from "@/lib/scope";

export type PayableKind = "payable" | "receivable";
export type PayableStatus = "pending" | "paid" | "canceled";

export type Payable = {
  id: string;
  scope: Scope;
  kind: PayableKind;
  description: string;
  amount: number;
  due_date: string;
  status: PayableStatus;
  paid_at: string | null;
  account_id: string | null;
  category_id: string | null;
  customer_id: string | null;
  recurrence: "none" | "monthly";
  notes: string | null;
  created_at: string;
  account_name: string | null;
  category_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
};

/** Filtro de status da tela ("atrasadas" é pendente com vencimento passado). */
export type StatusFilter = "pendentes" | "atrasadas" | "pagas" | "canceladas" | "todas";

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "pendentes", label: "Pendentes" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "pagas", label: "Pagas" },
  { value: "canceladas", label: "Canceladas" },
  { value: "todas", label: "Todas" },
];

export type DueBadge = "overdue" | "today" | null;

/** Selo do vencimento: "Atrasado" (antes de hoje) ou "Vence hoje", só para pendentes. */
export function dueBadge(payable: Pick<Payable, "status" | "due_date">, today: string): DueBadge {
  if (payable.status !== "pending") return null;
  if (payable.due_date < today) return "overdue";
  if (payable.due_date === today) return "today";
  return null;
}

export const KIND_LABEL: Record<PayableKind, { tab: string; paid: string; action: string }> = {
  payable: { tab: "A pagar", paid: "Paga", action: "Marcar como paga" },
  receivable: { tab: "A receber", paid: "Recebida", action: "Marcar como recebida" },
};
