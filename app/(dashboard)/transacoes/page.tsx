import { createTransaction, deleteTransaction } from "@/app/actions/transactions";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { getAccounts } from "@/lib/accounts";
import { getCategories } from "@/lib/categories";
import { getTransactions } from "@/lib/transactions";

export default async function TransacoesPage() {
  const accounts = await getAccounts();
  const categories = await getCategories();
  const transactions = await getTransactions();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Transações
        </h1>

        <p className="mt-2 text-zinc-400">
          Cadastre receitas e despesas.
        </p>
      </div>

      <TransactionForm
        action={createTransaction}
        accounts={accounts}
        categories={categories}
      />

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full">
          <thead className="border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left">Descrição</th>
              <th className="px-6 py-4 text-left">Conta</th>
              <th className="px-6 py-4 text-left">Categoria</th>
              <th className="px-6 py-4 text-left">Valor</th>
              <th className="px-6 py-4 text-left">Data</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-10 text-center text-zinc-500"
                >
                  Nenhuma transação cadastrada.
                </td>
              </tr>
            )}

            {transactions.map((transaction: any) => (
              <tr
                key={transaction.id}
                className="border-t border-zinc-800"
              >
                <td className="px-6 py-4">
                  {transaction.description}
                </td>

                <td className="px-6 py-4">
                  {transaction.accounts?.name}
                </td>

                <td className="px-6 py-4">
                  {transaction.categories?.icon}{" "}
                  {transaction.categories?.name}
                </td>

                <td className="px-6 py-4">
                  R$ {Number(transaction.amount).toFixed(2)}
                </td>

                <td className="px-6 py-4">
                  {transaction.transaction_date}
                </td>

                <td className="px-6 py-4 text-right">
                  <form action={deleteTransaction}>
                    <input
                      type="hidden"
                      name="id"
                      value={transaction.id}
                    />

                    <button className="text-red-500 hover:text-red-400">
                      Excluir
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}