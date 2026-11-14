import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import type { Scope } from "@/lib/scope";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  color: string;
  initial_balance: number;
  /** Saldo até hoje (lançamentos com data futura ficam em balance_future). */
  current_balance: number;
  /** Soma dos lançamentos agendados (data depois de hoje). */
  balance_future: number;
  scope: Scope;
  created_at: string;
  updated_at: string;
};

/** Contas do escopo ativo. `allScopes` lista as duas (ex.: conta padrão do WhatsApp). */
export async function getAccounts(options: { allScopes?: boolean } = {}) {
  const supabase = await createClient();

  const user = await getAuthUser();

  if (!user) return [];

  let query = supabase
    .from("accounts_today")
    .select("*")
    .eq("user_id", user.id);

  if (!options.allScopes) query = query.eq("scope", await getActiveScope());

  const { data, error } = await query
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as (Account & { balance_today: number | string })[]).map(
    ({ balance_today, ...account }) => ({
      ...account,
      current_balance: Number(balance_today),
      balance_future: Number(account.balance_future ?? 0),
    })
  ) as Account[];
}
