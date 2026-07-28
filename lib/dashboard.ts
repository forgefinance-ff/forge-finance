import { createClient } from "@/lib/supabase/server";

export type DashboardData = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  accountCount: number;
  chartData: {
    month: string;
    receitas: number;
    despesas: number;
  }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalBalance: 0,
      totalIncome: 0,
      totalExpense: 0,
      accountCount: 0,
      chartData: [],
    };
  }

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("user_id", user.id),

    supabase
      .from("transactions")
      .select("amount,type,transaction_date")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: true }),
  ]);

  const totalBalance =
    accounts?.reduce(
      (acc, account) => acc + Number(account.current_balance),
      0
    ) ?? 0;

  const totalIncome =
    transactions
      ?.filter((t) => t.type === "income")
      .reduce((acc, t) => acc + Number(t.amount), 0) ?? 0;

  const totalExpense =
    transactions
      ?.filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + Number(t.amount), 0) ?? 0;

  const grouped = new Map<
    string,
    {
      receitas: number;
      despesas: number;
    }
  >();

  transactions?.forEach((transaction) => {
    const month = new Date(transaction.transaction_date).toLocaleDateString(
      "pt-BR",
      {
        month: "short",
      }
    );

    if (!grouped.has(month)) {
      grouped.set(month, {
        receitas: 0,
        despesas: 0,
      });
    }

    const item = grouped.get(month)!;

    if (transaction.type === "income") {
      item.receitas += Number(transaction.amount);
    }

    if (transaction.type === "expense") {
      item.despesas += Number(transaction.amount);
    }
  });

  const chartData = Array.from(grouped.entries()).map(([month, values]) => ({
    month,
    receitas: values.receitas,
    despesas: values.despesas,
  }));

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    accountCount: accounts?.length ?? 0,
    chartData,
  };
}