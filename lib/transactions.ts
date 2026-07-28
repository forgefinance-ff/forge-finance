import { createClient } from "@/lib/supabase/server";

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
    .order("transaction_date", { ascending: false });

  if (error) throw error;

  return data ?? [];
}