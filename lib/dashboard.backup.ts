import { createClient } from "@/lib/supabase/server";

export type RecentTransaction = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  transactionDate: string;
};

export type DashboardData = {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  accountCount: number;
  hasData: boolean;

  chartData: {
    month: string;
    receitas: number;
    despesas: number;
  }[];

  recentTransactions: RecentTransaction[];
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
      hasData: false,
      chartData: [],
      recentTransactions: [],
    };
  }

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("user_id", user.id),

    supabase
      .from("transactions")
      .select(
        `
        id,
        amount,
        type,
        description,
        category,
        transaction_date
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false }),
  ]);

  const totalBalance =
    accounts?.reduce(
      (acc, account) => acc + Number(account.current_balance),
      0
    ) ?? 0;

  let totalIncome = 0;
  let totalExpense = 0;

  const grouped = new Map<
    string,
    {
      receitas: number;
      despesas: number;
    }
  >();

  transactions?.forEach((transaction) => {
    const value = Number(transaction.amount);

    const month = new Date(
      transaction.transaction_date
    ).toLocaleDateString("pt-BR", {
      month: "short",
    });

    if (!grouped.has(month)) {
      grouped.set(month, {
        receitas: 0,
        despesas: 0,
      });
    }

    const item = grouped.get(month)!;

    if (transaction.type === "income") {
      totalIncome += value;
      item.receitas += value;
    } else {
      totalExpense += value;
      item.despesas += value;
    }
  });

  const chartData = Array.from(grouped.entries())
    .reverse()
    .map(([month, values]) => ({
      month,
      receitas: values.receitas,
      despesas: values.despesas,
    }));

  const recentTransactions =
    transactions?.slice(0, 5).map((transaction) => ({
      id: transaction.id,
      title: transaction.description ?? "Sem descrição",
      amount: Number(transaction.amount),
      type: transaction.type,
      category: transaction.category ?? "Sem categoria",
      transactionDate: transaction.transaction_date,
    })) ?? [];

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    accountCount: accounts?.length ?? 0,
    chartData,
    recentTransactions,
    hasData: (transactions?.length ?? 0) > 0,
  };
}