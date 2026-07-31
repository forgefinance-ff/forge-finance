import { createTransaction, deleteTransaction } from "@/app/actions/transactions";
import { NewTransactionSheet } from "@/components/transactions/new-transaction-sheet";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionsList } from "@/components/transactions/transactions-list";
import { TransactionsSummary } from "@/components/transactions/transactions-summary";
import { getAccounts } from "@/lib/accounts";
import { getCategories } from "@/lib/categories";
import { getTransactions } from "@/lib/transactions";

export default async function TransacoesPage() {
  const accounts = await getAccounts();
  const categories = await getCategories();
  const transactions = await getTransactions();

  return (
    <div className="space-y-8">
      <NewTransactionSheet
        action={createTransaction}
        accounts={accounts}
        categories={categories}
      />

      <TransactionsSummary transactions={transactions} />

      <TransactionsFilters />

      <TransactionsList
        transactions={transactions}
        deleteAction={deleteTransaction}
      />
    </div>
  );
}