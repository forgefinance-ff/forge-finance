import { createClient } from "@/lib/supabase/server";

export type ReportSummary = {
  income: number;
  expenses: number;
  balance: number;
  netWorth: number;
};

export async function getReportSummary(): Promise<ReportSummary> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      income: 0,
      expenses: 0,
      balance: 0,
      netWorth: 0,
    };
  }

  const [{ data: transactions }, { data: accounts }, { data: investments }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", user.id),

      supabase
        .from("accounts")
        .select("current_balance")
        .eq("user_id", user.id),

      supabase
        .from("investments")
        .select("current_amount")
        .eq("user_id", user.id),
    ]);

  const income =
    transactions
      ?.filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const expenses =
    transactions
      ?.filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

  const balance = income - expenses;

  const accountsTotal =
    accounts?.reduce(
      (sum, account) => sum + Number(account.current_balance),
      0
    ) ?? 0;

  const investmentsTotal =
    investments?.reduce(
      (sum, investment) => sum + Number(investment.current_amount),
      0
    ) ?? 0;

  return {
    income,
    expenses,
    balance,
    netWorth: accountsTotal + investmentsTotal,
  };
}