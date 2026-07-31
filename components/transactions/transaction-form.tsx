"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createCategory } from "@/app/actions/categories";
import { Account } from "@/lib/accounts";
import { Category } from "@/lib/categories";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#09090B] px-4 py-3 text-white outline-none transition focus:border-violet-500";

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
  onSuccess?: () => void;
};

export function TransactionForm({
  action,
  accounts,
  categories,
  onSuccess,
}: Props) {
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
      className="space-y-4 rounded-2xl border border-white/10 bg-[#111827] p-6"
    >
      <h2 className="text-xl font-semibold text-white">Nova Transação</h2>

      <input
        name="description"
        required
        placeholder="Descrição"
        className={inputClass}
      />

      <select name="account_id" required className={inputClass}>
        <option value="">Selecione a conta</option>

        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>

      <select
        name="type"
        value={type}
        onChange={(event) => {
          setType(event.target.value as "expense" | "income");
          setSelectedCategoryId("");
        }}
        className={inputClass}
      >
        <option value="expense">Despesa</option>
        <option value="income">Receita</option>
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

            {visibleCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewCategory((value) => !value)}
            className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 transition hover:border-violet-500/40 hover:text-violet-300"
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
            <p className="text-sm font-medium text-slate-300">
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
                      : "bg-white/5 hover:bg-white/10"
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
                className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-[#09090B]"
              />

              <button
                type="button"
                disabled={isCreatingCategory || !newCategoryName.trim()}
                onClick={handleCreateCategory}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingCategory ? "Criando..." : "Criar categoria"}
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        type="number"
        step="0.01"
        name="amount"
        required
        placeholder="Valor"
        className={inputClass}
      />

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
