import { StatementImporter } from "@/components/import/statement-importer";
import { getAccounts } from "@/lib/accounts";
import { getCategories } from "@/lib/categories";

export default async function ImportarPage() {
  const [accounts, categories] = await Promise.all([getAccounts(), getCategories()]);

  return (
    <div className="space-y-8">
      <div className="rounded-[22px] border border-line bg-surface p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          Importar extrato
        </h1>

        <p className="mt-2 max-w-2xl text-muted-foreground">
          Envie o extrato exportado do seu banco (OFX, CSV ou Excel .xlsx). Você revisa cada
          lançamento, escolhe a categoria e só então importa. Nada é salvo antes da sua
          confirmação.
        </p>
      </div>

      <StatementImporter accounts={accounts} categories={categories} />
    </div>
  );
}
