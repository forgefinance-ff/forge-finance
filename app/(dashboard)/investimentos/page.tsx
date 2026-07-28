import { deleteInvestmentAction } from "@/app/actions/investments";
import { InvestmentForm } from "@/components/investments/investment-form";
import { getInvestments } from "@/lib/investments";

export default async function InvestimentosPage() {
  const investments = await getInvestments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Investimentos
        </h1>

        <p className="mt-2 text-slate-400">
          Acompanhe seus investimentos e sua evolução patrimonial.
        </p>
      </div>

      <InvestmentForm />

      <div className="rounded-2xl border border-white/10 bg-[#111827] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr className="text-left text-slate-400">
              <th className="p-4">Investimento</th>
              <th className="p-4">Instituição</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Rentabilidade</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>

          <tbody>
            {investments.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-slate-500"
                >
                  Nenhum investimento cadastrado.
                </td>
              </tr>
            )}

            {investments.map((investment) => {
              const profit =
                investment.current_amount -
                investment.invested_amount;

              const percentage =
                investment.invested_amount > 0
                  ? (profit / investment.invested_amount) * 100
                  : 0;

              return (
                <tr
                  key={investment.id}
                  className="border-b border-white/5"
                >
                  <td className="p-4">
                    <div className="font-medium text-white">
                      {investment.name}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(investment.current_amount)}
                    </div>
                  </td>

                  <td className="p-4 text-slate-300">
                    {investment.institution}
                  </td>

                  <td className="p-4 text-slate-300">
                    {investment.type}
                  </td>

                  <td className="p-4">
                    <div
                      className={
                        profit >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(profit)}
                    </div>

                    <div className="text-sm text-slate-400">
                      {percentage.toFixed(2)}%
                    </div>
                  </td>

                  <td className="p-4">
                    <form action={deleteInvestmentAction}>
                      <input
                        type="hidden"
                        name="id"
                        value={investment.id}
                      />

                      <button className="text-red-400 hover:text-red-300">
                        Excluir
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
  );
}