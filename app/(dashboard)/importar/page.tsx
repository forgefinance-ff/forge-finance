import { StatementImporter } from "@/components/import/statement-importer";
import { getAccounts } from "@/lib/accounts";
import { getCards } from "@/lib/cards";
import { getCategories } from "@/lib/categories";
import { createClient, getAuthUser } from "@/lib/supabase/server";

async function getUserName() {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    profile?.full_name ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    ""
  );
}

export default async function ImportarPage() {
  const [accounts, categories, userName, cards] = await Promise.all([
    getAccounts(),
    getCategories(),
    getUserName(),
    getCards(),
  ]);

  return (
    <div className="space-y-8">
      <div className="pt-2 pb-2">

        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          Importar extrato
        </h1>

        <p className="mt-2 max-w-2xl text-muted-foreground">
          Envie o extrato exportado do seu banco (OFX, CSV ou Excel .xlsx). Você revisa cada
          lançamento, escolhe a categoria e só então importa. Nada é salvo antes da sua
          confirmação.
        </p>
      </div>

      <StatementImporter
        accounts={accounts}
        categories={categories}
        userName={userName}
        cards={cards.map((card) => ({ id: card.id, name: card.name }))}
      />
    </div>
  );
}
