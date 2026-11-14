"use client";

import { useId, useState, useTransition } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Plus, X } from "lucide-react";

import { BankCard } from "@/components/cards/bank-card";
import { SuccessCheck } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { createCategory } from "@/app/actions/categories";
import type { ActionResult } from "@/app/actions/transactions";
import type { Account } from "@/lib/accounts";
import type { Card } from "@/lib/cards";
import type { Category } from "@/lib/categories";
import { todayInBrazil } from "@/lib/dates";
import { KIND_HINT, KIND_LABEL } from "@/lib/movement-kinds";

const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";
const labelClass = "mb-1.5 block text-sm font-medium text-text-soft";

const EMOJI_SUGGESTIONS = ["🍔", "🏠", "🏥", "🚗", "📚", "🎮", "🛍️", "🧾", "📺", "🐶", "💼", "💻", "📈", "🎁", "💰"];

/** Transação já existente (modo edição). */
export type EditableTransaction = {
  id: string;
  type: "income" | "expense";
  description: string;
  amount: number;
  transaction_date: string;
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
};

type Mode = "expense" | "income" | "transfer";

type Props = {
  action: (formData: FormData) => Promise<ActionResult | void>;
  /** Transferência entre contas próprias (aparece só ao criar). */
  transferAction?: (formData: FormData) => Promise<ActionResult | void>;
  accounts: Account[];
  categories: Category[];
  /** Cartões de crédito: a compra vai para a fatura, sem mexer no saldo. */
  cards?: Card[];
  onSuccess?: () => void;
  /** Preenche o formulário para editar. */
  transaction?: EditableTransaction;
  /** Some o título e a borda (quando já está dentro de um painel com título). */
  bare?: boolean;
  /** Usa `transaction` só como modelo e cria uma nova (duplicar). */
  asNew?: boolean;
};

export function TransactionForm({
  action,
  transferAction,
  accounts,
  categories,
  cards = [],
  onSuccess,
  transaction,
  bare = false,
  asNew = false,
}: Props) {
  const uid = useId();
  const editing = !!transaction && !asNew;
  const [mode, setMode] = useState<Mode>(transaction?.type ?? "expense");
  const type: "income" | "expense" = mode === "income" ? "income" : "expense";
  const [method, setMethod] = useState<"account" | "card">(transaction?.card_id ? "card" : "account");
  const onCard = mode !== "transfer" && method === "card" && cards.length > 0;
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryList, setCategoryList] = useState(categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction?.category_id ?? "");

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isCreatingCategory, startCategoryTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💰");
  const [newCategoryColor, setNewCategoryColor] = useState("#7C3AED");

  const visibleCategories = categoryList.filter((category) => category.type === type);
  const selectedCategory = categoryList.find((category) => category.id === selectedCategoryId);
  const today = todayInBrazil();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const run = mode === "transfer" && transferAction ? transferAction : action;
        const result = await run(formData);
        if (result && !result.ok) {
          setError(result.error);
          return;
        }
        setSaved(true);
        await new Promise((resolve) => setTimeout(resolve, 900));
        setSaved(false);
        onSuccess?.();
      } catch {
        setError("Não foi possível salvar. Confira os dados e tente de novo.");
      }
    });
  }

  function handleCreateCategory() {
    if (!newCategoryName.trim()) return;

    const formData = new FormData();
    formData.set("name", newCategoryName.trim());
    formData.set("type", type);
    formData.set("color", newCategoryColor);
    formData.set("icon", newCategoryIcon);

    startCategoryTransition(async () => {
      const created = await createCategory(formData);
      setCategoryList((current) => [...current, created]);
      setSelectedCategoryId(created.id);
      setShowNewCategory(false);
      setNewCategoryName("");
      setNewCategoryIcon("💰");
    });
  }

  const modes: { value: Mode; label: string; icon: typeof ArrowDownLeft }[] = [
    { value: "expense", label: onCard ? "Compra" : "Saída", icon: ArrowUpRight },
    { value: "income", label: onCard ? "Estorno" : "Entrada", icon: ArrowDownLeft },
  ];
  if (!editing && transferAction && accounts.length > 1) {
    modes.push({ value: "transfer", label: "Transferir", icon: ArrowLeftRight });
  }

  return (
    <form
      action={handleSubmit}
      className={bare ? "relative space-y-4" : "relative space-y-4 rounded-2xl border border-line bg-surface p-6"}
    >
      {saved && (
        <div
          role="status"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface-solid text-success"
        >
          <SuccessCheck />
          <p className="text-sm font-medium text-foreground">
            {editing ? "Alterações salvas" : mode === "transfer" ? "Transferência registrada" : "Transação registrada"}
          </p>
        </div>
      )}

      {!bare && (
        <h2 className="text-xl font-semibold text-foreground">{editing ? "Editar transação" : "Nova transação"}</h2>
      )}

      {editing && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="payment_method" value={onCard ? "card" : "account"} />

      {/* 1. Tipo */}
      <div
        role="radiogroup"
        aria-label="Tipo de movimentação"
        className="grid gap-1 rounded-xl border border-line bg-tint p-1 text-sm"
        style={{ gridTemplateColumns: `repeat(${modes.length}, minmax(0, 1fr))` }}
      >
        {modes.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            onClick={() => {
              setMode(value);
              if (value !== mode) setSelectedCategoryId("");
            }}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-medium transition ${
              mode === value ? "bg-brand/15 text-brand-soft" : "text-faint hover:text-text-soft"
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* 2. Valor (primeiro, como no WhatsApp) */}
      <div className={onCard && type === "expense" && !editing ? "grid grid-cols-[1fr_120px] gap-3" : undefined}>
        <div>
          <label htmlFor={`${uid}-amount`} className={labelClass}>
            {onCard && type === "expense" && !editing ? "Valor total" : "Valor"}
          </label>
          <MoneyInput
            id={`${uid}-amount`}
            name="amount"
            required
            prefix
            autoFocus={!editing}
            defaultValue={transaction?.amount ?? null}
            className={`${inputClass} text-2xl font-semibold`}
          />
        </div>

        {onCard && type === "expense" && !editing && (
          <div>
            <label htmlFor={`${uid}-installments`} className={labelClass}>
              Parcelas
            </label>
            <select id={`${uid}-installments`} name="installments" defaultValue="1" className={inputClass}>
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "À vista" : `${n}x`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {mode === "transfer" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-from`} className={labelClass}>
              De
            </label>
            <select id={`${uid}-from`} name="from_account_id" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Conta de origem
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${uid}-to`} className={labelClass}>
              Para
            </label>
            <select id={`${uid}-to`} name="to_account_id" required className={inputClass} defaultValue="">
              <option value="" disabled>
                Conta de destino
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Mover dinheiro entre suas contas não é receita nem despesa: os totais do mês não mudam.
          </p>
        </div>
      ) : null}

      {/* 3. Descrição */}
      <div>
        <label htmlFor={`${uid}-description`} className={labelClass}>
          {mode === "transfer" ? "Observação (opcional)" : "Descrição"}
        </label>
        <input
          id={`${uid}-description`}
          name="description"
          required={mode !== "transfer"}
          maxLength={120}
          defaultValue={transaction?.description ?? ""}
          placeholder={mode === "transfer" ? "Ex.: reserva do mês" : "Ex.: Mercado, Uber, Salário"}
          className={inputClass}
        />
      </div>

      {mode !== "transfer" && (
        <>
          {/* 4. Categoria */}
          <div>
            <label htmlFor={`${uid}-category`} className={labelClass}>
              Categoria
            </label>
            <div className="flex items-center gap-2">
              <select
                id={`${uid}-category`}
                name="category_id"
                required
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecione a categoria</option>
                <optgroup label={type === "income" ? "Receitas" : "Despesas"}>
                  {visibleCategories
                    .filter((category) => !category.kind || category.kind === "regular")
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                </optgroup>
                {!onCard && visibleCategories.some((category) => category.kind && category.kind !== "regular") && (
                  <optgroup label="Aportes, empréstimos e reembolsos">
                    {visibleCategories
                      .filter((category) => category.kind && category.kind !== "regular")
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name} ({KIND_LABEL[category.kind]})
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              <button
                type="button"
                onClick={() => setShowNewCategory((value) => !value)}
                className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl border border-line bg-tint text-text-soft transition hover:border-violet-500/40 hover:text-brand-soft"
                aria-label={showNewCategory ? "Fechar nova categoria" : "Criar nova categoria"}
                aria-expanded={showNewCategory}
              >
                {showNewCategory ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </button>
            </div>

            {showNewCategory && (
              <div className="mt-3 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
                <p className="text-sm font-medium text-text-soft">
                  Nova categoria de {type === "expense" ? "despesa" : "receita"}
                </p>
                <label htmlFor={`${uid}-newcat`} className="sr-only">
                  Nome da categoria
                </label>
                <input
                  id={`${uid}-newcat`}
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Nome da categoria"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ícone">
                  {EMOJI_SUGGESTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      role="radio"
                      aria-checked={newCategoryIcon === emoji}
                      aria-label={`Ícone ${emoji}`}
                      onClick={() => setNewCategoryIcon(emoji)}
                      className={`flex h-11 w-11 items-center justify-center rounded-lg text-lg transition ${
                        newCategoryIcon === emoji ? "bg-violet-500/30 ring-1 ring-violet-400" : "bg-tint hover:bg-tint-strong"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor={`${uid}-newcolor`} className="sr-only">
                    Cor da categoria
                  </label>
                  <input
                    id={`${uid}-newcolor`}
                    type="color"
                    value={newCategoryColor}
                    onChange={(event) => setNewCategoryColor(event.target.value)}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-line-strong bg-surface-solid"
                  />
                  <button
                    type="button"
                    disabled={isCreatingCategory || !newCategoryName.trim()}
                    onClick={handleCreateCategory}
                    className="min-h-11 flex-1 rounded-lg glass-primary px-4 py-2 text-sm font-semibold text-background transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingCategory ? "Criando..." : "Criar categoria"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {selectedCategory && selectedCategory.kind && selectedCategory.kind !== "regular" && (
            <p className="rounded-xl border border-brand-bright/25 bg-brand/10 px-4 py-3 text-xs text-text-soft">
              {KIND_HINT[selectedCategory.kind]}
            </p>
          )}

          {/* 5. Conta ou cartão */}
          {cards.length > 0 && (
            <div
              role="radiogroup"
              aria-label="Forma de pagamento"
              className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-tint p-1 text-sm"
            >
              {(
                [
                  ["account", "Conta (débito, Pix, dinheiro)"],
                  ["card", "Cartão de crédito"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={method === value}
                  onClick={() => setMethod(value)}
                  className={`min-h-11 rounded-lg px-3 py-2 font-medium transition ${
                    method === value ? "bg-brand/15 text-brand-soft" : "text-faint hover:text-text-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {onCard ? (
            <>
              <fieldset>
                <legend className="sr-only">Cartão</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {cards.map((card, index) => (
                    <label
                      key={card.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm text-text-soft transition-colors hover:border-line-strong has-[:checked]:border-text has-[:checked]:bg-tint-strong has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40"
                    >
                      <input
                        type="radio"
                        name="card_id"
                        value={card.id}
                        required
                        defaultChecked={transaction?.card_id ? transaction.card_id === card.id : index === 0}
                        className="sr-only"
                      />
                      <BankCard name={card.name} color={card.color} size="mini" />
                      <span className="min-w-0 flex-1 truncate font-medium">{card.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="-mt-2 text-xs text-muted-foreground">
                Entra como despesa na data da compra e vai para a fatura. O saldo da conta só muda quando você
                pagar a fatura (na página Cartões).
              </p>
            </>
          ) : (
            <div>
              <label htmlFor={`${uid}-account`} className={labelClass}>
                Conta
              </label>
              <select
                id={`${uid}-account`}
                name="account_id"
                required
                defaultValue={transaction?.account_id ?? (accounts.length === 1 ? accounts[0].id : "")}
                className={inputClass}
              >
                <option value="">Selecione a conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      {/* 6. Data */}
      <div>
        <label htmlFor={`${uid}-date`} className={labelClass}>
          Data
        </label>
        <input
          id={`${uid}-date`}
          type="date"
          name="transaction_date"
          required
          defaultValue={transaction?.transaction_date?.slice(0, 10) ?? today}
          className={inputClass}
        />
        {mode !== "transfer" && (
          <p className="mt-1 text-xs text-faint">Data futura? Fica em &quot;a vencer&quot; até o dia chegar.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="min-h-11 w-full">
        {isPending
          ? "Salvando..."
          : editing
            ? "Salvar alterações"
            : mode === "transfer"
              ? "Transferir"
              : "Salvar transação"}
      </Button>
    </form>
  );
}
