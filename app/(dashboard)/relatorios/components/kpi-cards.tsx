import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  income: number;
  expenses: number;
  balance: number;
  netWorth: number;
  /** Despesas com data depois de hoje (parcelas do cartão, agendadas). */
  upcomingExpenses?: number;
};

export function KpiCards({
  income,
  expenses,
  balance,
  netWorth,
  upcomingExpenses = 0,
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
      description:
        upcomingExpenses > 0
          ? `Até hoje. Mais ${formatCurrency(upcomingExpenses)} a vencer.`
          : "Total de despesas do período, até hoje.",
    },
    {
      title: "Resultado",
      value: formatCurrency(balance),
      description: "Receitas menos despesas.",
    },
    {
      title: "Patrimônio",
      value: formatCurrency(netWorth),
      description: "Contas (até hoje) + investimentos.",
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

            <p className="mt-1 text-sm text-muted-foreground">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}