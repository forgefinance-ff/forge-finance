import { Trash2 } from "lucide-react";

import { deleteCardAction } from "@/app/actions/cards";
import { CardForm } from "@/components/cards/card-form";
import { getCards } from "@/lib/cards";

export default async function CartoesPage() {
  const cards = await getCards();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/10 bg-[#111827] p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-violet-400">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-white">
          Cartões
        </h1>

        <p className="mt-2 max-w-xl text-slate-400">
          Gerencie seus cartões de crédito.
        </p>
      </div>

      <CardForm />

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#111827]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
          <thead className="border-b border-white/10">
            <tr className="text-left text-slate-400">
              <th className="p-4">Nome</th>
              <th className="p-4">Limite</th>
              <th className="p-4">Fechamento</th>
              <th className="p-4">Vencimento</th>
              <th className="p-4 text-right">Ações</th>
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
                className="border-b border-white/5 transition hover:bg-white/[0.03]"
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

                <td className="p-4 text-right">
                  <form action={deleteCardAction}>
                    <input
                      type="hidden"
                      name="id"
                      value={card.id}
                    />

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