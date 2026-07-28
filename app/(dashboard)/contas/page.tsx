import { AccountForm } from "@/components/accounts/account-form";
import {
  createAccount,
  deleteAccount,
} from "@/app/actions/accounts";
import { getAccounts } from "@/lib/accounts";

export default async function ContasPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">
            Contas
          </h1>

          <p className="mt-2 text-zinc-400">
            Gerencie suas contas financeiras.
          </p>
        </div>
      </div>

      <AccountForm action={createAccount} />

      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
        <table className="w-full">
          <thead className="border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-left">Conta</th>
              <th className="px-6 py-4 text-left">Tipo</th>
              <th className="px-6 py-4 text-left">Saldo</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-10 text-center text-zinc-500"
                >
                  Nenhuma conta cadastrada.
                </td>
              </tr>
            )}

            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-t border-zinc-800"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor: account.color,
                      }}
                    />

                    {account.name}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {account.type}
                </td>

                <td className="px-6 py-4">
                  R${" "}
                  {Number(account.current_balance).toLocaleString(
                    "pt-BR",
                    {
                      minimumFractionDigits: 2,
                    }
                  )}
                </td>

                <td className="px-6 py-4 text-right">
                  <form action={deleteAccount}>
                    <input
                      type="hidden"
                      name="id"
                      value={account.id}
                    />

                    <button className="font-medium text-red-500 hover:text-red-400">
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