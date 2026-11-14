import { BudgetsWorkspace } from "@/components/budgets/budgets-workspace";
import { getBudgets } from "@/lib/budgets";
import { getCategories } from "@/lib/categories";

export const metadata = { title: "Orçamentos · Forge Finance" };

export default async function OrcamentosPage() {
  const [budgets, categories] = await Promise.all([getBudgets(), getCategories()]);

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">Orçamentos</h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Quanto você quer gastar por mês em cada categoria. Conta só o que já aconteceu no mês.
        </p>
      </div>
      <BudgetsWorkspace budgets={budgets} categories={categories} />
    </div>
  );
}
