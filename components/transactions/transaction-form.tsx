"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createCategory } from "@/app/actions/categories";
import { Account } from "@/lib/accounts";
import type { Card } from "@/lib/cards";
import { Category } from "@/lib/categories";
import { KIND_HINT, KIND_LABEL } from "@/lib/movement-kinds";

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-4 py-3 text-foreground outline-none transition focus:border-violet-500";

const EMOJI_SUGGESTIONS = [
  "🍔",
  "🏠",
  "🏥",
  "🚗",
  "📚",
  "🎮",
  "🛍️",
  "🧾",
  "📺",
  "🐶",
  "💼",
  "💻",
  "📈",
  "🎁",
  "💰",
];

type Props = {
  action: (formData: FormData) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  /** Cartões de crédito: a compra vai para a fatura, sem mexer no saldo. */
  cards?: Card[];
  onSuccess?: () => void;
};

export function TransactionForm({
  action,
  accounts,
  categories,
  cards = [],
  onSuccess,
}: Props) {
  const [method, setMethod] = useState<"account" | "card">("account");
  const onCard = method === "card" && cards.length > 0;
  const [isPending, startTransition] = useTransition();
  const [categoryList, setCategoryList] = useState(categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isCreatingCategory, startCategoryTransition] = useTransition();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💰");
  const [newCategoryColor, setNewCategoryColor] = useState("#7C3AED");

  const visibleCategories = categoryList.filter(
    (category) => category.type === type
  );

  const selectedCategory = categoryList.find(
    (category) => category.id === selectedCategoryId
  );

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
      onSuccess?.();
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

  return (
    <form
      action={handleSubmit}
      className="space-y-4 rounded-2xl border border-line bg-surface p-6"
    >
      <h2 className="text-xl font-semibold text-foreground">Nova Transação</h2>

      <input
        name="description"
        required
        placeholder="Descrição"
        className={inputClass}
      />

      <input type="hidden" name="payment_method" value={onCard ? "card" : "account"} />

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
              className={`rounded-lg px-3 py-2 font-medium transition ${
                method === value
                  ? "bg-brand/15 text-brand-soft"
                  : "text-faint hover:text-text-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {onCard ? (
        <>
          <select name="card_id" required className={inputClass}>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                💳 {card.name}
              </option>
            ))}
          </select>
          <p className="-mt-2 text-xs text-muted-foreground">
            Entra como despesa na data da compra e vai para a fatura. O saldo da conta só muda
            quando você pagar a fatura (na página Cartões).
          </p>
        </>
      ) : (
        <select name="account_id" required className={inputClass}>
          <option value="">Selecione a conta</option>

          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      )}

      <select
        name="type"
        value={type}
        onChange={(event) => {
          setType(event.target.value as "expense" | "income");
          setSelectedCategoryId("");
        }}
        className={inputClass}
      >
        {onCard ? (
          <>
            <option value="expense">Compra</option>
            <option value="income">Estorno (devolução no cartão)</option>
          </>
        ) : (
          <>
            <option value="expense">Saída (despesa, aporte retirado, empréstimo pago…)</option>
            <option value="income">Entrada (receita, aporte, empréstimo recebido…)</option>
          </>
        )}
      </select>

      <div>
        <div className="flex items-center gap-2">
          <select
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

            {visibleCategories.some((category) => category.kind && category.kind !== "regular") && (
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
            title="Criar nova categoria"
          >
            {showNewCategory ? (
              <X className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
          </button>
        </div>

        {showNewCategory && (
          <div className="mt-3 space-y-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
            <p className="text-sm font-medium text-text-soft">
              Nova categoria de {type === "expense" ? "despesa" : "receita"}
            </p>

            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Nome da categoria"
              className={inputClass}
            />

            <div className="flex flex-wrap gap-2">
              {EMOJI_SUGGESTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewCategoryIcon(emoji)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition ${
                    newCategoryIcon === emoji
                      ? "bg-violet-500/30 ring-1 ring-violet-400"
                      : "bg-tint hover:bg-tint-strong"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(event) => setNewCategoryColor(event.target.value)}
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-background-soft"
              />

              <button
                type="button"
                disabled={isCreatingCategory || !newCategoryName.trim()}
                onClick={handleCreateCategory}
                className="flex-1 rounded-lg bg-gradient-to-r from-brand to-brand-indigo px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
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

      <div className={onCard && type === "expense" ? "grid grid-cols-[1fr_120px] gap-3" : undefined}>
        <input
          type="number"
          step="0.01"
          name="amount"
          required
          placeholder={onCard && type === "expense" ? "Valor total" : "Valor"}
          className={inputClass}
        />

        {onCard && type === "expense" && (
          <label className="block">
            <span className="sr-only">Parcelas</span>
            <select name="installments" defaultValue="1" className={inputClass} aria-label="Parcelas">
              {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "À vista" : `${n}x`}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <input
        type="date"
        name="transaction_date"
        required
        className={inputClass}
      />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Salvando..." : "Salvar Transação"}
      </Button>
    </form>
  );
}
