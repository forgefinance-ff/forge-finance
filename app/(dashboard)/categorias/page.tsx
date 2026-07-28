import { CategoryForm } from "@/components/categories/category-form";
import {
  createCategory,
  deleteCategory,
} from "@/app/actions/categories";
import { getCategories } from "@/lib/categories";

export default async function CategoriasPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Categorias
        </h1>

        <p className="mt-2 text-zinc-400">
          Gerencie suas categorias de receitas e despesas.
        </p>
      </div>

      <CategoryForm action={createCategory} />

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full">
          <thead className="border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left">Categoria</th>
              <th className="px-6 py-4 text-left">Tipo</th>
              <th className="px-6 py-4 text-left">Ícone</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {categories.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-zinc-500"
                >
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            )}

            {categories.map((category) => (
              <tr
                key={category.id}
                className="border-t border-zinc-800"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor: category.color,
                      }}
                    />

                    {category.name}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {category.type === "income"
                    ? "Receita"
                    : "Despesa"}
                </td>

                <td className="px-6 py-4 text-2xl">
                  {category.icon}
                </td>

                <td className="px-6 py-4 text-right">
                  <form action={deleteCategory}>
                    <input
                      type="hidden"
                      name="id"
                      value={category.id}
                    />

                    <button className="font-medium text-red-500 hover:text-red-400">
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}