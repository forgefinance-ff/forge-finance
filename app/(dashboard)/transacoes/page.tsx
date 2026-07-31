import { createTransaction, deleteTransaction } from "@/app/actions/transactions";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import { getAccounts } from "@/lib/accounts";
import { getCategories } from "@/lib/categories";
import { getTransactions } from "@/lib/transactions";

export default async function TransacoesPage() {
  const accounts = await getAccounts();
  const categories = await getCategories();
  const transactions = await getTransactions();

  return (
    <TransactionsWorkspace
      transactions={transactions}
      accounts={accounts}
      categories={categories}
      createAction={createTransaction}
      deleteAction={deleteTransaction}
    />
  );
}
