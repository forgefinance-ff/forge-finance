import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import type { Scope } from "@/lib/scope";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  color: string;
  initial_balance: number;
  current_balance: number;
  scope: Scope;
  created_at: string;
  updated_at: string;
};

/** Contas do escopo ativo. `allScopes` lista as duas (ex.: conta padrão do WhatsApp). */
export async function getAccounts(options: { allScopes?: boolean } = {}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id);

  if (!options.allScopes) query = query.eq("scope", await getActiveScope());

  const { data, error } = await query
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Account[];
}
