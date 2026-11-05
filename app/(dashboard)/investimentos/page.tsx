import { Trash2 } from "lucide-react";

import { deleteInvestmentAction } from "@/app/actions/investments";
import { InvestmentForm } from "@/components/investments/investment-form";
import { getInvestments } from "@/lib/investments";

export default async function InvestimentosPage() {
  const investments = await getInvestments();

  return (
    <div className="space-y-8">
      <div className="rounded-[22px] border border-line bg-surface p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          Investimentos
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Acompanhe seus investimentos e sua evolução patrimonial.
        </p>
      </div>

      <InvestmentForm />

      <div className="rounded-[22px] border border-line bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
          <thead className="border-b border-line">
            <tr className="text-left text-muted-foreground">
              <th className="p-4">Investimento</th>
              <th className="p-4">Instituição</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Rentabilidade</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {investments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-faint"
                >
                  Nenhum investimento cadastrado.
                </td>
              </tr>
            )}

            {investments.map((investment) => {
              const profit =
                investment.current_value -
                investment.invested_amount;

              const percentage =
                investment.invested_amount > 0
                  ? (profit / investment.invested_amount) * 100
                  : 0;

              return (
                <tr
                  key={investment.id}
                  className="border-b border-line transition hover:bg-tint"
                >
                  <td className="p-4">
                    <div className="font-medium text-foreground">
                      {investment.name}
                    </div>

                    <div className="mt-1 text-sm text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(investment.current_value)}
                    </div>
                  </td>

                  <td className="p-4 text-text-soft">
                    {investment.institution}
                  </td>

                  <td className="p-4 text-text-soft">
                    {investment.type}
                  </td>

                  <td className="p-4">
                    <div
                      className={
                        profit >= 0
                          ? "text-success"
                          : "text-danger"
                      }
                    >
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(profit)}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {percentage.toFixed(2)}%
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    <form action={deleteInvestmentAction}>
                      <input
                        type="hidden"
                        name="id"
                        value={investment.id}
                      />

                      <button
                        type="submit"
                        className="rounded-lg p-2 text-faint transition hover:bg-rose-500/10 hover:text-danger"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
