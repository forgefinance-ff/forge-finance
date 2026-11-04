import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";

import { createCategory, deleteCategory } from "@/app/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { SuggestedBusinessCategories } from "@/components/categories/suggested-business-categories";
import { getCategories } from "@/lib/categories";
import { KIND_LABEL } from "@/lib/movement-kinds";
import { getActiveScope } from "@/lib/scope-server";

type CategoryList = Awaited<ReturnType<typeof getCategories>>;

export default async function CategoriasPage() {
  const [categories, scope] = await Promise.all([getCategories(), getActiveScope()]);

  const isRegular = (c: CategoryList[number]) => !c.kind || c.kind === "regular";

  const incomeCategories = categories.filter((c) => c.type === "income" && isRegular(c));
  const expenseCategories = categories.filter((c) => c.type === "expense" && isRegular(c));
  const specialCategories = categories.filter((c) => !isRegular(c));

  return (
    <div className="space-y-8">
      <div className="rounded-[22px] border border-line bg-surface p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          Categorias
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Organize entradas e saídas por categoria. Uma categoria pode ter o mesmo nome na
          entrada e na saída (por exemplo, “Outros”): o app sempre separa as duas.
        </p>
      </div>

      {scope === "business" && <SuggestedBusinessCategories />}

      <CategoryForm action={createCategory} />

      <CategoryGroup
        title="Entradas (receitas)"
        tone="income"
        categories={incomeCategories}
        deleteAction={deleteCategory}
      />

      <CategoryGroup
        title="Saídas (despesas)"
        tone="expense"
        categories={expenseCategories}
        deleteAction={deleteCategory}
      />

      <CategoryGroup
        title="Aportes, empréstimos e reembolsos"
        description="Mexem no saldo das contas, mas não entram em receitas, despesas nem no faturamento do MEI."
        categories={specialCategories}
        deleteAction={deleteCategory}
        showKind
      />
    </div>
  );
}

function CategoryGroup({
  title,
  description,
  tone,
  categories,
  deleteAction,
  showKind = false,
}: {
  title: string;
  description?: string;
  tone?: "income" | "expense";
  categories: CategoryList;
  deleteAction: (formData: FormData) => Promise<void>;
  showKind?: boolean;
}) {
  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {tone === "income" && <ArrowDownLeft className="h-5 w-5 text-success" />}
        {tone === "expense" && <ArrowUpRight className="h-5 w-5 text-danger" />}
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}

      {categories.length === 0 ? (
        <p className="mt-5 text-sm text-faint">Nenhuma categoria cadastrada aqui.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group flex items-center justify-between rounded-2xl border border-line bg-tint p-4 transition hover:border-violet-500/20 hover:bg-tint"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${category.color}26` }}
                >
                  {category.icon}
                </div>

                <div className="min-w-0">
                  <span className="block truncate font-medium text-foreground">
                    {category.name}
                  </span>
                  {showKind && (
                    <span
                      className={`text-xs font-medium ${
                        category.type === "income" ? "text-success" : "text-danger"
                      }`}
                    >
                      {KIND_LABEL[category.kind]} ·{" "}
                      {category.type === "income" ? "entrada" : "saída"}
                    </span>
                  )}
                </div>
              </div>

              <form action={deleteAction}>
                <input type="hidden" name="id" value={category.id} />

                <button
                  type="submit"
                  aria-label={`Excluir ${category.name}`}
                  className="rounded-lg p-2 text-faint opacity-0 transition hover:bg-rose-500/10 hover:text-danger group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
