import { createClient } from "@/lib/supabase/server";

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

/** Clientes da empresa (ativos ou arquivados). A busca é feita na tela. */
export async function getCustomers(options: { archived?: boolean } = {}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("customers")
    .select("*")
    .eq("user_id", user.id);

  query = options.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const { data, error } = await query.order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Customer[];
}

/** Quantos clientes estão arquivados (para o estado vazio da aba Ativos). */
export async function countArchivedCustomers(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("archived_at", "is", null);

  if (error) throw error;

  return count ?? 0;
}
