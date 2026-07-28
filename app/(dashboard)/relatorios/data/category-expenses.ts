import { createClient } from "@/lib/supabase/server";

export type CategoryExpense = {
  name: string;
  value: number;
};

export async function getCategoryExpenses(): Promise<CategoryExpense[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      amount,
      type,
      categories(name)
    `)
    .eq("user_id", user.id)
    .eq("type", "expense");

  if (error) throw error;

  const totals = new Map<string, number>();

  for (const item of data ?? []) {
    const name =
      (item.categories as { name?: string } | null)?.name ?? "Sem categoria";

    totals.set(name, (totals.get(name) ?? 0) + Number(item.amount));
  }

  return [...totals.entries()].map(([name, value]) => ({
    name,
    value,
  }));
}