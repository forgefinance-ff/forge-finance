import { createClient } from "@/lib/supabase/server";

export type CashFlowItem = {
  month: string;
  receitas: number;
  despesas: number;
};

export async function getCashFlowData(): Promise<CashFlowItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: true });

  if (error) {
    throw error;
  }

  const months = new Map<string, CashFlowItem>();

  for (const transaction of transactions ?? []) {
    const date = new Date(transaction.transaction_date);

    const month = date.toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });

    if (!months.has(month)) {
      months.set(month, {
        month,
        receitas: 0,
        despesas: 0,
      });
    }

    const item = months.get(month)!;

    if (transaction.type === "income") {
      item.receitas += Number(transaction.amount);
    } else {
      item.despesas += Number(transaction.amount);
    }
  }

  return [...months.values()];
}