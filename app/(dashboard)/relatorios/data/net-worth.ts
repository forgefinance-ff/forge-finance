import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";

export type NetWorthItem = {
  month: string;
  patrimonio: number;
};

export async function getNetWorthData(): Promise<NetWorthItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const scope = await getActiveScope();

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("current_balance")
    .eq("user_id", user.id)
    .eq("scope", scope);

  if (accountsError) throw accountsError;

  const { data: investments, error: investmentsError } = await supabase
    .from("investments")
    .select("current_value")
    .eq("user_id", user.id)
    .eq("scope", scope);

  if (investmentsError) throw investmentsError;

  const totalAccounts =
    accounts?.reduce(
      (sum, account) => sum + Number(account.current_balance),
      0
    ) ?? 0;

  const totalInvestments =
    investments?.reduce(
      (sum, investment) => sum + Number(investment.current_value),
      0
    ) ?? 0;

  const total = totalAccounts + totalInvestments;

  const month = new Date().toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  });

  return [
    {
      month,
      patrimonio: total,
    },
  ];
}
