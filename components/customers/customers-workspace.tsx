"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  HistoryIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { deleteCustomer, setCustomerArchived } from "@/app/actions/customers";
import { CustomerForm } from "@/components/customers/customer-form";
import { EmptyState } from "@/components/mei/empty-state";
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
import type { Customer } from "@/lib/customers";
import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import { dueBadge, type Payable } from "@/lib/payables-shared";
import { formatBrPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Props = {
  customers: Customer[];
  archived: boolean;
  /** Contas a receber com cliente, para totais e histórico. */
  receivables: Payable[];
  today: string;
};

type Totals = { open: number; received: number; count: number };

export function CustomersWorkspace({ customers, archived, receivables, today }: Props) {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Customer | null>(null);

  const totals = useMemo(() => {
    const map = new Map<string, Totals>();

    for (const p of receivables) {
      if (!p.customer_id) continue;
      const item = map.get(p.customer_id) ?? { open: 0, received: 0, count: 0 };
      item.count += 1;
      if (p.status === "pending") item.open += p.amount;
      if (p.status === "paid") item.received += p.amount;
      map.set(p.customer_id, item);
    }

    return map;
  }, [receivables]);
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    const digits = query.replace(/\D/g, "");

    if (!q) return customers;

    return customers.filter(
      (c) =>
        normalize(c.name).includes(q) ||
        (c.email && normalize(c.email).includes(q)) ||
        (digits.length >= 3 && c.phone?.includes(digits))
    );
  }, [customers, query]);

  function toggleArchive(customer: Customer) {
    startTransition(async () => {
      const result = await setCustomerArchived(customer.id, !customer.archived_at);

      if (result.ok) {
        toast.success(customer.archived_at ? "Cliente reativado." : "Cliente arquivado.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;

    startTransition(async () => {
      const result = await deleteCustomer(target.id);

      if (result.ok) {
        toast.success("Cliente excluído.");
        setDeleting(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar cliente"
            placeholder="Buscar por nome, telefone ou e-mail"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-faint focus:border-brand-bright/50 focus:ring-2 focus:ring-brand-bright/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <nav
            aria-label="Filtrar clientes"
            className="flex rounded-full border border-line bg-tint p-1 text-sm"
          >
            {[
              { href: "/clientes", label: "Ativos", active: !archived },
              { href: "/clientes?arquivados=1", label: "Arquivados", active: archived },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-medium transition",
                  tab.active
                    ? "bg-brand/15 text-brand-soft"
                    : "text-faint hover:text-text-soft"
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {!archived && (
            <Button onClick={() => setEditing("new")}>
              <PlusIcon className="h-4 w-4" />
              Novo cliente
            </Button>
          )}
        </div>
      </div>

      {customers.length === 0 ? (
        archived ? (
          <EmptyState
            icon={ArchiveIcon}
            title="Nenhum cliente arquivado"
            description="Clientes arquivados saem da lista principal, mas o histórico deles continua guardado."
          />
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="Cadastre seu primeiro cliente"
            description="Com os clientes cadastrados você registra contas a receber e cobra pelo WhatsApp com um toque."
          >
            <Button onClick={() => setEditing("new")}>
              <PlusIcon className="h-4 w-4" />
              Novo cliente
            </Button>
          </EmptyState>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="Nenhum cliente encontrado"
          description={`Nada corresponde a “${query.trim()}”. Confira a grafia ou busque pelo telefone.`}
        >
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpar busca
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <li
              key={customer.id}
              className="flex flex-col rounded-[22px] border border-line bg-surface p-5 transition hover:border-line-strong"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-indigo text-sm font-semibold text-white">
                  {customer.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase())
                    .join("")}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-foreground">{customer.name}</h3>

                  <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                    {customer.phone && (
                      <p className="flex items-center gap-2">
                        <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                        {formatBrPhone(customer.phone)}
                      </p>
                    )}
                    {customer.email && (
                      <p className="flex min-w-0 items-center gap-2">
                        <MailIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </p>
                    )}
                    {!customer.phone && !customer.email && (
                      <p className="text-faint">Sem contato cadastrado</p>
                    )}
                  </div>
                </div>
              </div>

              {customer.notes && (
                <p className="mt-3 line-clamp-2 text-sm text-text-soft">{customer.notes}</p>
              )}

              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-line bg-tint p-3">
                <div>
                  <dt className="text-xs text-faint">Em aberto</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(totals.get(customer.id)?.open ?? 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-faint">Já recebido</dt>
                  <dd className="font-semibold tabular-nums text-success">
                    {formatCurrency(totals.get(customer.id)?.received ?? 0)}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-end gap-1 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => setHistory(customer)}
                  className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-text-soft transition hover:bg-brand/10 hover:text-brand-soft"
                >
                  <HistoryIcon className="h-4 w-4" />
                  Histórico
                </button>
                {!customer.archived_at && (
                  <button
                    type="button"
                    onClick={() => setEditing(customer)}
                    className="rounded-lg p-2 text-faint transition hover:bg-brand/10 hover:text-brand-soft"
                    aria-label={`Editar ${customer.name}`}
                    title="Editar"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleArchive(customer)}
                  className="rounded-lg p-2 text-faint transition hover:bg-tint-strong hover:text-text-soft disabled:opacity-50"
                  aria-label={`${customer.archived_at ? "Reativar" : "Arquivar"} ${customer.name}`}
                  title={customer.archived_at ? "Reativar" : "Arquivar"}
                >
                  {customer.archived_at ? (
                    <ArchiveRestoreIcon className="h-4 w-4" />
                  ) : (
                    <ArchiveIcon className="h-4 w-4" />
                  )}
                </button>
                {!totals.has(customer.id) && (
                <button
                  type="button"
                  onClick={() => setDeleting(customer)}
                  className="rounded-lg p-2 text-faint transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Excluir ${customer.name}`}
                  title="Excluir"
                >
                  <Trash2Icon className="h-4 w-4" />
                </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing === "new" ? "Novo cliente" : "Editar cliente"}</SheetTitle>
            <SheetDescription>
              O telefone com DDD é usado para cobrar pelo WhatsApp.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
            {editing !== null && (
              <CustomerForm
                key={editing === "new" ? "new" : editing.id}
                customer={editing === "new" ? undefined : editing}
                onSuccess={() => setEditing(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={history !== null} onOpenChange={(open) => !open && setHistory(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Histórico de {history?.name}</SheetTitle>
            <SheetDescription>
              Contas a receber deste cliente. Registre novas em Contas a pagar/receber.
            </SheetDescription>
          </SheetHeader>

          {history && (
            <CustomerHistory
              items={receivables.filter((p) => p.customer_id === history.id)}
              totals={totals.get(history.id) ?? { open: 0, received: 0, count: 0 }}
              today={today}
            />
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Este cliente não tem cobranças. O cadastro será apagado de vez. Se você quer só tirar da lista, use
              Arquivar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={confirmDelete}>
              {isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CustomerHistory({
  items,
  totals,
  today,
}: {
  items: Payable[];
  totals: Totals;
  today: string;
}) {
  return (
    <div className="space-y-4 px-4 pb-6">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-line bg-tint p-3">
          <dt className="text-xs text-faint">Em aberto</dt>
          <dd className="text-lg font-semibold tabular-nums text-foreground">
            {formatCurrency(totals.open)}
          </dd>
        </div>
        <div className="rounded-2xl border border-line bg-tint p-3">
          <dt className="text-xs text-faint">Já recebido</dt>
          <dd className="text-lg font-semibold tabular-nums text-success">
            {formatCurrency(totals.received)}
          </dd>
        </div>
      </dl>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-sm text-faint">
          Nenhuma cobrança registrada para este cliente ainda.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {items.map((p) => {
            const badge = dueBadge(p, today);

            return (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{p.description}</p>
                  <p className="text-xs text-faint">
                    {p.status === "paid" && p.paid_at
                      ? `Recebido em ${formatDateBR(p.paid_at)}`
                      : p.status === "canceled"
                        ? `Cancelado · vencia em ${formatDateBR(p.due_date)}`
                        : `Vence em ${formatDateBR(p.due_date)}`}
                    {badge === "overdue" && <span className="font-semibold text-danger"> · Atrasado</span>}
                    {badge === "today" && <span className="font-semibold text-warning"> · Vence hoje</span>}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    p.status === "paid" ? "text-success" : p.status === "canceled" ? "text-faint line-through" : "text-foreground"
                  )}
                >
                  {formatCurrency(p.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
