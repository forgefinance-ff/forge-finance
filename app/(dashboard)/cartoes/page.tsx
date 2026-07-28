import { deleteCardAction } from "@/app/actions/cards";
import { CardForm } from "@/components/cards/card-form";
import { getCards } from "@/lib/cards";

export default async function CartoesPage() {
  const cards = await getCards();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-white">
          Cartões
        </h1>

        <p className="mt-2 text-slate-400">
          Gerencie seus cartões de crédito.
        </p>
      </div>

      <CardForm />

      <div className="rounded-2xl border border-white/10 bg-[#111827]">
        <table className="w-full">
          <thead className="border-b border-white/10">
            <tr className="text-left text-slate-400">
              <th className="p-4">Nome</th>
              <th className="p-4">Limite</th>
              <th className="p-4">Fechamento</th>
              <th className="p-4">Vencimento</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>

          <tbody>
            {cards.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-slate-500"
                >
                  Nenhum cartão cadastrado.
                </td>
              </tr>
            )}

            {cards.map((card) => (
              <tr
                key={card.id}
                className="border-b border-white/5"
              >
                <td className="p-4 text-white">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        background: card.color,
                      }}
                    />

                    {card.name}
                  </div>
                </td>

                <td className="p-4 text-slate-300">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(card.limit_amount)}
                </td>

                <td className="p-4 text-slate-300">
                  Dia {card.closing_day}
                </td>

                <td className="p-4 text-slate-300">
                  Dia {card.due_day}
                </td>

                <td className="p-4">
                  <form action={deleteCardAction}>
                    <input
                      type="hidden"
                      name="id"
                      value={card.id}
                    />

                    <button
                      className="text-red-400 hover:text-red-300"
                    >
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