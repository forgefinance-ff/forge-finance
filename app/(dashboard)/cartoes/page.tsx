import { Trash2 } from "lucide-react";

import { deleteCardAction } from "@/app/actions/cards";
import { CardForm } from "@/components/cards/card-form";
import { getCards } from "@/lib/cards";

export default async function CartoesPage() {
  const cards = await getCards();

  return (
    <div className="space-y-8">
      <div className="rounded-[22px] border border-line bg-surface p-8">
        <span className="text-sm font-medium uppercase tracking-[0.25em] text-brand-soft">
          Financeiro
        </span>

        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
          Cartões
        </h1>

        <p className="mt-2 max-w-xl text-muted-foreground">
          Gerencie seus cartões de crédito.
        </p>
      </div>

      <CardForm />

      <div className="overflow-hidden rounded-[22px] border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
          <thead className="border-b border-line">
            <tr className="text-left text-muted-foreground">
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
                  className="p-6 text-center text-faint"
                >
                  Nenhum cartão cadastrado.
                </td>
              </tr>
            )}

            {cards.map((card) => (
              <tr
                key={card.id}
                className="border-b border-line transition hover:bg-tint"
              >
                <td className="p-4 text-foreground">
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

                <td className="p-4 text-text-soft">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(card.limit_amount)}
                </td>

                <td className="p-4 text-text-soft">
                  Dia {card.closing_day}
                </td>

                <td className="p-4 text-text-soft">
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