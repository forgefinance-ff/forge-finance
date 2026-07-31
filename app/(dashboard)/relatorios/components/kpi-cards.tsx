import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  income: number;
  expenses: number;
  balance: number;
  netWorth: number;
};

export function KpiCards({
  income,
  expenses,
  balance,
  netWorth,
}: Props) {
  const cards = [
    {
      title: "Receitas",
      value: formatCurrency(income),
      description: "Total de receitas do período.",
    },
    {
      title: "Despesas",
      value: formatCurrency(expenses),
      description: "Total de despesas do período.",
    },
    {
      title: "Saldo",
      value: formatCurrency(balance),
      description: "Resultado financeiro.",
    },
    {
      title: "Patrimônio",
      value: formatCurrency(netWorth),
      description: "Contas + Investimentos.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold">{card.value}</p>

            <p className="mt-1 text-sm text-slate-400">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}