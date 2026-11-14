import { Trash2 } from "lucide-react";

import { AccountForm } from "@/components/accounts/account-form";
import { createAccount, deleteAccount } from "@/app/actions/accounts";
import { getAccounts } from "@/lib/accounts";

export default async function ContasPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-8">
      <div className="pt-2 pb-2">

        <h1 className="text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          Contas
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Gerencie suas contas financeiras.
        </p>
      </div>

      <AccountForm action={createAccount} />

      {/* Celular: um cartão por conta, sem rolar para o lado. */}
      <ul className="space-y-3 sm:hidden">
        {accounts.length === 0 && (
          <li className="rounded-[22px] border border-line bg-surface py-10 text-center text-faint">
            Nenhuma conta cadastrada.
          </li>
        )}

        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex items-center gap-3 rounded-[22px] border border-line bg-surface px-4 py-4"
          >
            <span
              aria-hidden
              className="h-4 w-4 shrink-0 rounded-full"
              style={{ backgroundColor: account.color }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{account.name}</p>
              <p className="truncate text-xs text-faint">{account.type}</p>
            </div>

            <p className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
              {Number(account.current_balance).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>

            <form action={deleteAccount}>
              <input type="hidden" name="id" value={account.id} />

              <button
                type="submit"
                aria-label={`Excluir a conta ${account.name}`}
                className="-mr-1 flex h-10 w-10 items-center justify-center rounded-lg text-faint transition hover:bg-rose-500/10 hover:text-danger"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-[22px] border border-line bg-surface sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="border-b border-line bg-tint">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-faint">
                  Conta
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-faint">
                  Tipo
                </th>

                <th className="px-6 py-4 text-left text-xs font-semibold text-faint">
                  Saldo
                </th>

                <th className="px-6 py-4 text-right text-xs font-semibold text-faint">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-faint">
                    Nenhuma conta cadastrada.
                  </td>
                </tr>
              )}

              {accounts.map((account) => (
                <tr
                  key={account.id}
                  className="border-b border-line transition hover:bg-tint"
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3 font-medium text-foreground">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: account.color }}
                      />

                      {account.name}
                    </div>
                  </td>

                  <td className="px-6 py-5 text-text-soft">
                    {account.type}
                  </td>

                  <td className="px-6 py-5 text-text-soft">
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
                        aria-label={`Excluir a conta ${account.name}`}
                        className="rounded-lg p-2 text-faint transition hover:bg-rose-500/10 hover:text-danger"
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
