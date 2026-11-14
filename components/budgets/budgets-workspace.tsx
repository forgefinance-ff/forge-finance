"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteBudget, saveBudget } from "@/app/actions/budgets";
import { BudgetBar } from "@/components/budgets/budget-bar";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import type { Budget } from "@/lib/budgets";
import type { Category } from "@/lib/categories";
import { formatCurrency } from "@/lib/formatters";

const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";

export function BudgetsWorkspace({ budgets, categories }: { budgets: Budget[]; categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Budget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const used = new Set(budgets.map((b) => b.categoryId));
  const options = categories.filter(
    (c) => c.type === "expense" && (!c.kind || c.kind === "regular") && (!used.has(c.id) || c.id === editing?.categoryId)
  );

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await saveBudget(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Orçamento atualizado." : "Orçamento criado.");
      setEditing(null);
      setFormKey((k) => k + 1);
      router.refresh();
    });
  }

  function remove(budget: Budget) {
    start(async () => {
      const result = await deleteBudget(budget.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Orçamento de ${budget.name} excluído.`);
      router.refresh();
    });
  }

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <form
        key={`${formKey}-${editing?.id ?? "new"}`}
        action={submit}
        className="h-fit space-y-4 rounded-[22px] border border-line bg-surface p-6"
      >
        <h2 className="text-xl font-semibold text-foreground">{editing ? `Editar ${editing.name}` : "Novo orçamento"}</h2>
        <p className="text-sm text-muted-foreground">
          Defina quanto quer gastar por mês numa categoria. O Forge avisa quando o ritmo indicar que vai estourar.
        </p>

        <div>
          <label htmlFor="budget-category" className="mb-1.5 block text-sm font-medium text-text-soft">
            Categoria
          </label>
          <select
            id="budget-category"
            name="category_id"
            required
            defaultValue={editing?.categoryId ?? ""}
            className={inputClass}
            disabled={!!editing}
          >
            <option value="" disabled>
              {options.length ? "Escolha a categoria" : "Todas as categorias já têm orçamento"}
            </option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          {editing && <input type="hidden" name="category_id" value={editing.categoryId} />}
        </div>

        <div>
          <label htmlFor="budget-limit" className="mb-1.5 block text-sm font-medium text-text-soft">
            Limite por mês
          </label>
          <MoneyInput
            id="budget-limit"
            name="monthly_limit"
            required
            prefix
            defaultValue={editing?.limit ?? null}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="min-h-11 flex-1">
            {pending ? "Salvando..." : editing ? "Salvar" : "Criar orçamento"}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <section aria-label="Orçamentos do mês" className="space-y-3">
        {budgets.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Este mês: <strong className="tabular-nums text-foreground">{formatCurrency(totalSpent)}</strong> de{" "}
            <span className="tabular-nums">{formatCurrency(totalLimit)}</span> planejados.
          </p>
        )}

        {budgets.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-line bg-surface p-8 text-center text-sm text-muted-foreground">
            Nenhum orçamento ainda. Comece pelas categorias que mais pesam, como Mercado ou Delivery.
          </div>
        ) : (
          <ul className="space-y-3">
            {budgets.map((b) => (
              <li key={b.id} className="rounded-[22px] border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <BudgetBar budget={b} />
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(b)}
                      aria-label={`Editar orçamento de ${b.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-faint transition hover:bg-tint hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(b)}
                      disabled={pending}
                      aria-label={`Excluir orçamento de ${b.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-faint transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
