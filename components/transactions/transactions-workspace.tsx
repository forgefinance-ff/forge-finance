"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Copy, Plus, ReceiptText, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type { ActionResult } from "@/app/actions/transactions";
import { TransactionForm, type EditableTransaction } from "@/components/transactions/transaction-form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Account } from "@/lib/accounts";
import type { Card } from "@/lib/cards";
import type { Category } from "@/lib/categories";
import { shiftDate } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import { transactionKindLabel } from "@/lib/movement-kinds";
import type { Statement, StatementRow } from "@/lib/transactions";

type Action = (formData: FormData) => Promise<ActionResult>;

type Props = {
  statement: Statement;
  today: string;
  prevMonth: string;
  nextMonth: string;
  isCurrentMonth: boolean;
  accounts: Account[];
  categories: Category[];
  cards?: Card[];
  createAction: Action;
  updateAction: Action;
  transferAction: Action;
  deleteAction: Action;
};

type TypeFilter = "all" | "income" | "expense";

const monthName = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function dayLabel(date: string, today: string) {
  if (date === today) return "Hoje";
  if (date === shiftDate(today, -1)) return "Ontem";
  if (date === shiftDate(today, 1)) return "Amanhã";
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1).replace(/\./g, "");
}

function signed(row: StatementRow) {
  return row.type === "income" ? row.amount : -row.amount;
}

function where(row: StatementRow) {
  if (row.cards?.name && row.accounts?.name) return `Fatura · ${row.cards.name}`;
  if (row.cards?.name) return `💳 ${row.cards.name}`;
  return row.accounts?.name ?? "—";
}

function groupByDay(rows: StatementRow[]) {
  const groups: { date: string; rows: StatementRow[]; net: number }[] = [];
  for (const row of rows) {
    const date = row.transaction_date.slice(0, 10);
    let group = groups[groups.length - 1];
    if (!group || group.date !== date) {
      group = { date, rows: [], net: 0 };
      groups.push(group);
    }
    group.rows.push(row);
    // Transferências e pagamentos de fatura não mudam o "quanto gastei".
    if (row.kind !== "transfer" && row.kind !== "card_payment") group.net += signed(row);
  }
  return groups;
}

export function TransactionsWorkspace({
  statement,
  today,
  prevMonth,
  nextMonth,
  isCurrentMonth,
  accounts,
  categories,
  cards = [],
  createAction,
  updateAction,
  transferAction,
  deleteAction,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [creating, setCreating] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<EditableTransaction | null>(null);
  const [selected, setSelected] = useState<StatementRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [searching, startSearch] = useTransition();
  const [search, setSearch] = useState(statement.query);

  const filtered = useMemo(
    () => (typeFilter === "all" ? statement.rows : statement.rows.filter((r) => r.type === typeFilter)),
    [statement.rows, typeFilter]
  );
  const past = filtered.filter((r) => r.transaction_date.slice(0, 10) <= today);
  const future = filtered.filter((r) => r.transaction_date.slice(0, 10) > today);
  const pastGroups = groupByDay(past);
  const futureGroups = groupByDay([...future].reverse());
  const futureTotal = future.reduce((s, r) => s + (r.kind === "transfer" ? 0 : signed(r)), 0);

  const monthHref = (month: string) => `${pathname}?m=${month}`;

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    const q = search.trim();
    startSearch(() => {
      router.push(q ? `${pathname}?q=${encodeURIComponent(q)}` : monthHref(statement.month));
    });
  }

  function openRow(row: StatementRow) {
    setConfirmDelete(false);
    setSelected(row);
  }

  function editable(row: StatementRow): EditableTransaction {
    return {
      id: row.id,
      type: row.type,
      description: row.description ?? row.title ?? "",
      amount: row.amount,
      transaction_date: row.transaction_date,
      account_id: row.account_id,
      card_id: row.account_id ? null : row.card_id,
      category_id: row.category_id,
    };
  }

  function remove(row: StatementRow) {
    const formData = new FormData();
    formData.set("id", row.id);
    startDelete(async () => {
      const result = await deleteAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(row.transfer_group ? "Transferência excluída (os dois lados)." : "Transação excluída.");
      setSelected(null);
      router.refresh();
    });
  }

  const lockedReason = selected
    ? selected.transfer_group
      ? "Transferências não são editadas: exclua e registre de novo."
      : selected.kind === "card_payment"
        ? "Pagamento de fatura: exclua e registre de novo na página Cartões."
        : null
    : null;

  const { totals, upcoming } = statement;
  const isSearch = !!statement.query;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <section className="flex items-end justify-between gap-4 pt-2">
        <div>
          <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">Transações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Toque num lançamento para editar.</p>
        </div>
        <Button type="button" onClick={() => setCreating(true)} className="min-h-11 rounded-xl">
          <Plus className="h-4 w-4 sm:mr-2" aria-hidden />
          <span className="hidden sm:inline">Nova transação</span>
          <span className="sr-only sm:hidden">Nova transação</span>
        </Button>
      </section>

      {/* Mês + busca */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isSearch ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {statement.rows.length} resultado{statement.rows.length === 1 ? "" : "s"} para{" "}
              <strong className="text-foreground">“{statement.query}”</strong>
              {statement.truncated ? " (mostrando os 200 mais recentes)" : ""}
            </span>
            <Link
              href={monthHref(statement.month)}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-brand-soft hover:underline"
              onClick={() => setSearch("")}
            >
              <X className="h-4 w-4" aria-hidden /> Limpar
            </Link>
          </div>
        ) : (
          <nav aria-label="Mês do extrato" className="flex items-center gap-1">
            <Link
              href={monthHref(prevMonth)}
              aria-label="Mês anterior"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-text-soft transition hover:bg-tint"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Link>
            <h2 className="min-w-44 text-center text-lg font-semibold text-foreground">
              {monthName(statement.month)}
            </h2>
            <Link
              href={monthHref(nextMonth)}
              aria-label="Próximo mês"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-text-soft transition hover:bg-tint"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Link>
            {!isCurrentMonth && (
              <Link href={pathname} className="ml-1 inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-brand-soft hover:underline">
                Hoje
              </Link>
            )}
          </nav>
        )}

        <form role="search" onSubmit={submitSearch} className="relative w-full sm:w-72">
          <label htmlFor="tx-search" className="sr-only">
            Buscar em todas as transações
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <input
            id="tx-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (ex.: mercado, uber)"
            className="min-h-11 w-full rounded-xl border border-line-strong bg-surface-solid py-2 pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15"
            aria-busy={searching}
          />
        </form>
      </section>

      {/* Resumo em uma linha */}
      {!isSearch && (
        <section
          aria-label="Resumo do mês"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm"
        >
          <span>
            <span className="text-muted-foreground">Entrou </span>
            <strong className="tabular-nums text-success">{formatCurrency(totals.income)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">Saiu </span>
            <strong className="tabular-nums text-danger">{formatCurrency(totals.expense)}</strong>
          </span>
          <span>
            <span className="text-muted-foreground">{totals.result >= 0 ? "Sobrou " : "Faltou "}</span>
            <strong className="tabular-nums text-foreground">{formatCurrency(Math.abs(totals.result))}</strong>
          </span>
          {upcoming.expense > 0 && (
            <span className="rounded-full bg-tint px-2.5 py-1 text-xs text-text-soft">
              A vencer no mês: <strong className="tabular-nums">{formatCurrency(upcoming.expense)}</strong>
            </span>
          )}
          {totals.othersNet !== 0 && (
            <span className="text-xs text-faint">
              Aportes/empréstimos/reembolsos: {formatCurrency(totals.othersNet)} (fora do resultado)
            </span>
          )}
        </section>
      )}

      {/* Filtro de tipo */}
      <div role="radiogroup" aria-label="Mostrar" className="flex gap-1 rounded-2xl border border-line bg-tint p-1 text-sm sm:w-fit">
        {(
          [
            ["all", "Todas"],
            ["income", "Entradas"],
            ["expense", "Saídas"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={typeFilter === value}
            onClick={() => setTypeFilter(value)}
            className={`min-h-11 flex-1 rounded-xl px-4 font-medium transition sm:flex-none ${
              typeFilter === value ? "bg-brand/15 text-brand-soft" : "text-faint hover:text-text-soft"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-tint">
            <ReceiptText className="text-faint" size={26} aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {isSearch ? "Nada encontrado" : "Nenhuma transação neste mês"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {isSearch ? "Tente outra palavra." : "Registre um gasto ou uma entrada para começar."}
          </p>
          {!isSearch && (
            <Button type="button" onClick={() => setCreating(true)} className="mt-4 min-h-11 rounded-xl">
              <Plus className="mr-2 h-4 w-4" aria-hidden /> Nova transação
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {futureGroups.length > 0 && (
            <details className="group rounded-2xl border border-line bg-surface">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium text-foreground">
                  A vencer · {future.length} lançamento{future.length === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-2 tabular-nums text-text-soft">
                  {formatCurrency(futureTotal)}
                  <ChevronRight className="h-4 w-4 transition group-open:rotate-90" aria-hidden />
                </span>
              </summary>
              <div className="border-t border-line">
                {futureGroups.map((group) => (
                  <DayGroup key={group.date} group={group} today={today} onOpen={openRow} muted />
                ))}
              </div>
            </details>
          )}

          {pastGroups.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {pastGroups.map((group) => (
                <DayGroup key={group.date} group={group} today={today} onOpen={openRow} showYear={isSearch} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nova transação / duplicar */}
      <Sheet
        open={creating || !!duplicateOf}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setDuplicateOf(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{duplicateOf ? "Duplicar transação" : "Nova transação"}</SheetTitle>
            <SheetDescription className="sr-only">Preencha o valor, a descrição e a categoria.</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <TransactionForm
              key={duplicateOf ? `dup-${duplicateOf.id}` : "new"}
              bare
              action={createAction}
              transferAction={transferAction}
              accounts={accounts}
              categories={categories}
              cards={cards}
              transaction={duplicateOf ?? undefined}
              asNew
              onSuccess={() => {
                setCreating(false);
                setDuplicateOf(null);
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Detalhe / edição */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{lockedReason ? "Detalhes" : "Editar transação"}</SheetTitle>
                <SheetDescription>
                  {selected.categories?.icon} {selected.categories?.name ?? transactionKindLabel(selected.kind) ?? "Sem categoria"} ·{" "}
                  {where(selected)}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                {lockedReason ? (
                  <div className="space-y-2 rounded-2xl border border-line bg-tint p-4 text-sm">
                    <p className="text-lg font-semibold text-foreground">{selected.description ?? selected.title}</p>
                    <p className={`text-2xl font-semibold tabular-nums ${selected.type === "income" ? "text-success" : "text-foreground"}`}>
                      {selected.type === "income" ? "+" : "−"} {formatCurrency(selected.amount)}
                    </p>
                    <p className="text-muted-foreground">{lockedReason}</p>
                  </div>
                ) : (
                  <TransactionForm
                    key={selected.id}
                    bare
                    action={updateAction}
                    accounts={accounts}
                    categories={categories}
                    cards={cards}
                    transaction={editable(selected)}
                    onSuccess={() => {
                      setSelected(null);
                      router.refresh();
                    }}
                  />
                )}

                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  {!lockedReason && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => {
                        const row = selected;
                        setSelected(null);
                        setDuplicateOf({ ...editable(row), transaction_date: today });
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" aria-hidden /> Duplicar
                    </Button>
                  )}
                  {confirmDelete ? (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        className="min-h-11"
                        disabled={deleting}
                        onClick={() => remove(selected)}
                      >
                        {deleting ? "Excluindo..." : selected.transfer_group ? "Excluir os dois lados" : "Confirmar exclusão"}
                      </Button>
                      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setConfirmDelete(false)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 text-danger hover:bg-danger/10 hover:text-danger"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Excluir
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DayGroup({
  group,
  today,
  onOpen,
  muted = false,
  showYear = false,
}: {
  group: { date: string; rows: StatementRow[]; net: number };
  today: string;
  onOpen: (row: StatementRow) => void;
  muted?: boolean;
  showYear?: boolean;
}) {
  const label = showYear
    ? new Date(`${group.date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
    : dayLabel(group.date, today);

  return (
    <section aria-label={label} className="border-b border-line last:border-b-0">
      <div className="flex items-center justify-between bg-tint/60 px-4 py-2 text-xs font-medium text-faint">
        <h3>{label}</h3>
        <span className="tabular-nums">{group.net >= 0 ? "+" : "−"} {formatCurrency(Math.abs(group.net))}</span>
      </div>
      <ul>
        {group.rows.map((row) => {
          const kind = transactionKindLabel(row.kind);
          const isIncome = row.type === "income";
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onOpen(row)}
                className={`flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-tint focus-visible:bg-tint focus-visible:outline-none ${
                  muted ? "opacity-75" : ""
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tint text-lg"
                  style={row.categories?.color ? { backgroundColor: `${row.categories.color}22` } : undefined}
                >
                  {row.categories?.icon ?? (row.kind === "transfer" ? "⇄" : row.card_id ? "💳" : "•")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{row.description ?? row.title ?? "Sem descrição"}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.categories?.name ?? kind ?? "Sem categoria"} · {where(row)}
                    {kind && row.categories?.name ? ` · ${kind}` : ""}
                  </span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${isIncome ? "text-success" : "text-foreground"}`}>
                  {isIncome ? "+" : "−"} {formatCurrency(row.amount)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
