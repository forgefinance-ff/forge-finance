import { createTransaction, deleteTransaction } from "@/app/actions/transactions";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import { getAccounts } from "@/lib/accounts";
import { getCards } from "@/lib/cards";
import { getCategories } from "@/lib/categories";
import { getTransactions } from "@/lib/transactions";

export default async function TransacoesPage() {
  const accounts = await getAccounts();
  const categories = await getCategories();
  const transactions = await getTransactions();
  const cards = await getCards();

  return (
    <TransactionsWorkspace
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      cards={cards}
      createAction={createTransaction}
      deleteAction={deleteTransaction}
    />
  );
}
