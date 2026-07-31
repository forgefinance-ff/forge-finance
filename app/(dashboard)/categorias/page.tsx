import { Trash2 } from "lucide-react";

import { createCategory, deleteCategory } from "@/app/actions/categories";
import { CategoryForm } from "@/components/categories/category-form";
import { getCategories } from "@/lib/categories";

export default async function CategoriasPage() {
  const categories = await getCategories();

  const expenseCategories = categories.filter(
    (category) => category.type === "expense"
  );

  const incomeCategories = categories.filter(
    (category) => category.type === "income"
  );

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-[#111827] p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Categorias
        </h1>

        <p className="mt-2 max-w-xl text-slate-400">
          Organize suas receitas e despesas por categoria. Já criamos um
          conjunto padrão pra você — sinta-se à vontade para editar ou
          adicionar novas.
        </p>
      </div>

      <CategoryForm action={createCategory} />

      <CategoryGroup
        title="Despesas"
        categories={expenseCategories}
        deleteAction={deleteCategory}
      />

      <CategoryGroup
        title="Receitas"
        categories={incomeCategories}
        deleteAction={deleteCategory}
      />
    </div>
  );
}

function CategoryGroup({
  title,
  categories,
  deleteAction,
}: {
  title: string;
  categories: Awaited<ReturnType<typeof getCategories>>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <h2 className="mb-5 text-lg font-semibold text-white">{title}</h2>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nenhuma categoria de {title.toLowerCase()} cadastrada.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-violet-500/20 hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${category.color}26` }}
                >
                  {category.icon}
                </div>

                <span className="font-medium text-white">
                  {category.name}
                </span>
              </div>

              <form action={deleteAction}>
                <input type="hidden" name="id" value={category.id} />

                <button
                  type="submit"
                  className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
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
