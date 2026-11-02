import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

export async function getTransactions() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      accounts(name),
      categories(name,color,icon)
    `)
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .order("transaction_date", { ascending: false });

  if (error) throw error;

  return data ?? [];
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type NewTransaction = {
  account_id: string;
  category_id: string | null;
  type: string;
  title: string;
  description: string | null;
  amount: number;
  transaction_date: string;
};

/**
 * Regra única de criação de transação: insere e ajusta o saldo da conta
 * numa só operação no banco (ff_create_transaction). Retorna o id criado.
 */
export async function insertTransactionWithBalance(
  supabase: SupabaseServerClient,
  input: NewTransaction
): Promise<string> {
  const { data, error } = await supabase.rpc("ff_create_transaction", {
    p_account_id: input.account_id,
    p_category_id: input.category_id,
    p_type: input.type,
    p_title: input.title,
    p_description: input.description,
    p_amount: input.amount,
    p_date: input.transaction_date,
  });

  if (error) throw new Error(error.message);

  return data as string;
}
