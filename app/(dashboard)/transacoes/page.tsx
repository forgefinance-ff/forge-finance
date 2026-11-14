import {
  createTransaction,
  deleteTransaction,
  transferBetweenAccounts,
  updateTransaction,
} from "@/app/actions/transactions";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import { getAccounts } from "@/lib/accounts";
import { getCards } from "@/lib/cards";
import { getCategories } from "@/lib/categories";
import { todayInBrazil } from "@/lib/dates";
import { currentMonth, getStatement, shiftMonth } from "@/lib/transactions";

type Props = {
  searchParams?: Promise<{ m?: string | string[]; q?: string | string[] }>;
};

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export default async function TransacoesPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};

  const [accounts, categories, statement, cards] = await Promise.all([
    getAccounts(),
    getCategories(),
    getStatement({ month: first(params.m), q: first(params.q) }),
    getCards(),
  ]);

  return (
    <TransactionsWorkspace
      statement={statement}
      today={todayInBrazil()}
      prevMonth={shiftMonth(statement.month, -1)}
      nextMonth={shiftMonth(statement.month, 1)}
      isCurrentMonth={statement.month === currentMonth()}
      accounts={accounts}
      categories={categories}
      cards={cards}
      createAction={createTransaction}
      updateAction={updateTransaction}
      transferAction={transferBetweenAccounts}
      deleteAction={deleteTransaction}
    />
  );
}
