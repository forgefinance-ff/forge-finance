import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { shiftDate, type ReportPeriod } from "./period";

export async function getSummaryData(period: ReportPeriod) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { income: 0, expenses: 0, balance: 0, netWorth: 0 };
  }

  const scope = await getActiveScope();

  let transactionsQuery = supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", user.id)
    .eq("scope", scope);

  if (period.from) {
    transactionsQuery = transactionsQuery.gte("transaction_date", period.from);
  }
  if (period.to) {
    transactionsQuery = transactionsQuery.lt(
      "transaction_date",
      shiftDate(period.to, 1)
    );
  }

  const [
    { data: transactions, error: transactionsError },
    { data: accounts, error: accountsError },
    { data: investments, error: investmentsError },
  ] = await Promise.all([
    transactionsQuery,
    supabase
      .from("accounts")
      .select("current_balance")
      .eq("user_id", user.id)
      .eq("scope", scope),
    supabase
      .from("investments")
      .select("current_value")
      .eq("user_id", user.id)
      .eq("scope", scope),
  ]);

  if (transactionsError) throw transactionsError;
  if (accountsError) throw accountsError;
  if (investmentsError) throw investmentsError;

  let income = 0;
  let expenses = 0;

  for (const transaction of transactions ?? []) {
    const value = Number(transaction.amount);

    if (transaction.type === "income") income += value;
    else expenses += value;
  }

  // Patrimônio é sempre o valor atual (contas + investimentos),
  // não depende do período selecionado.
  const netWorth =
    (accounts ?? []).reduce(
      (sum, account) => sum + Number(account.current_balance),
      0
    ) +
    (investments ?? []).reduce(
      (sum, investment) => sum + Number(investment.current_value ?? 0),
      0
    );

  return {
    income,
    expenses,
    balance: income - expenses,
    netWorth,
  };
}
