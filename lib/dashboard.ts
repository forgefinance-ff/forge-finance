import { createClient } from "@/lib/supabase/server";

export type RecentTransaction = {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  transactionDate: string;
};

export type ChartPoint = {
  label: string;
  receitas: number;
  despesas: number;
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

  chart7d: ChartPoint[];
  chart30d: ChartPoint[];
  chart12m: ChartPoint[];

  recentTransactions: RecentTransaction[];
};

type RawTransaction = {
  amount: number;
  type: "income" | "expense";
  transaction_date: string;
};

function buildChartByDay(
  transactions: RawTransaction[],
  days: number
): ChartPoint[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  const buckets = new Map<
    string,
    { sortKey: number; label: string; receitas: number; despesas: number }
  >();

  for (let i = 0; i < days; i++) {
    const date = new Date(cutoff);
    date.setDate(cutoff.getDate() + i);

    const key = date.toISOString().slice(0, 10);

    buckets.set(key, {
      sortKey: date.getTime(),
      label: date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      receitas: 0,
      despesas: 0,
    });
  }

  transactions.forEach((transaction) => {
    const date = new Date(transaction.transaction_date);

    if (date < cutoff) return;

    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key);

    if (!bucket) return;

    const value = Number(transaction.amount);

    if (transaction.type === "income") {
      bucket.receitas += value;
    } else {
      bucket.despesas += value;
    }
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, receitas, despesas }) => ({
      label,
      receitas,
      despesas,
    }));
}

function buildChartByMonth(
  transactions: RawTransaction[],
  months: number
): ChartPoint[] {
  const now = new Date();

  const buckets = new Map<
    string,
    { sortKey: number; label: string; receitas: number; despesas: number }
  >();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;

    buckets.set(key, {
      sortKey: date.getTime(),
      label: date
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", ""),
      receitas: 0,
      despesas: 0,
    });
  }

  transactions.forEach((transaction) => {
    const date = new Date(transaction.transaction_date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const bucket = buckets.get(key);

    if (!bucket) return;

    const value = Number(transaction.amount);

    if (transaction.type === "income") {
      bucket.receitas += value;
    } else {
      bucket.despesas += value;
    }
  });

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ label, receitas, despesas }) => ({
      label,
      receitas,
      despesas,
    }));
}

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
      chart7d: [],
      chart30d: [],
      chart12m: [],
      recentTransactions: [],
    };
  }

  const [
    { data: accounts, error: accountsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
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
        transaction_date,
        categories(name,color,icon)
      `
      )
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false }),
  ]);

  if (accountsError) throw accountsError;
  if (transactionsError) throw transactionsError;

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
    transactions?.slice(0, 5).map((transaction: any) => ({
      id: transaction.id,
      title: transaction.description ?? "Sem descrição",
      amount: Number(transaction.amount),
      type: transaction.type,
      category: transaction.categories?.name ?? "Sem categoria",
      transactionDate: transaction.transaction_date,
    })) ?? [];

  const rawTransactions: RawTransaction[] =
    transactions?.map((transaction) => ({
      amount: Number(transaction.amount),
      type: transaction.type,
      transaction_date: transaction.transaction_date,
    })) ?? [];

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    accountCount: accounts?.length ?? 0,
    chartData,
    chart7d: buildChartByDay(rawTransactions, 7),
    chart30d: buildChartByDay(rawTransactions, 30),
    chart12m: buildChartByMonth(rawTransactions, 12),
    recentTransactions,
    hasData: (transactions?.length ?? 0) > 0,
  };
}