import { Trash2 } from "lucide-react";

import { AccountForm } from "@/components/accounts/account-form";
import { createAccount, deleteAccount } from "@/app/actions/accounts";
import { getAccounts } from "@/lib/accounts";

export default async function ContasPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-[#111827] p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Contas
        </h1>

        <p className="mt-2 max-w-xl text-slate-400">
          Gerencie suas contas financeiras.
        </p>
      </div>

      <AccountForm action={createAccount} />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-white/10 bg-white/[0.02]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Conta
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tipo
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Saldo
                </th>

                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              )}

              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3 font-medium text-white">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />

                      {account.name}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-slate-300">
                    {account.type}
                  </td>

                  <td className="px-6 py-5 text-slate-300">
                    {Number(account.current_balance).toLocaleString(
                      "pt-BR",
                      {
                        style: "currency",
                        currency: "BRL",
                      }
                    )}
                  </td>

                  <td className="px-6 py-5 text-right">
                    <form action={deleteAccount}>
                      <input type="hidden" name="id" value={account.id} />

                      <button
                        type="submit"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
