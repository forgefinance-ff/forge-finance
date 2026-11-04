import type { BusinessPanel } from "@/lib/business-panel";
import { cn } from "@/lib/utils";

import { brl, pct } from "./format";

export function BusinessKpis({ panel }: { panel: BusinessPanel }) {
  const { current, breakeven, projection, cashToday } = panel;
  const missingToBreakeven =
    breakeven.revenueNeeded !== null ? Math.max(breakeven.revenueNeeded - current.revenue, 0) : null;

  type Kpi = { title: string; value: string; hint: string; tone?: "danger" | "success" | "warning" };

  const cards: Kpi[] = [
    {
      title: "Caixa hoje",
      value: brl(cashToday),
      hint: "Soma das contas da empresa",
      tone: cashToday < 0 ? "danger" : undefined,
    },
    {
      title: "Faturamento do mês",
      value: brl(current.revenue),
      hint: `${current.salesCount} ${current.salesCount === 1 ? "venda" : "vendas"} no mês`,
    },
    {
      title: "Lucro do mês",
      value: brl(current.profit),
      hint: `Margem de lucro ${pct(current.profitPct)}`,
      tone: current.profit < 0 ? "danger" : "success",
    },
    {
      title: "Ponto de equilíbrio",
      value: breakeven.revenueNeeded !== null ? brl(breakeven.revenueNeeded) : "—",
      hint:
        missingToBreakeven === null
          ? "Precisa de faturamento e custos para calcular"
          : missingToBreakeven > 0
            ? `Faltam ${brl(missingToBreakeven)} este mês`
            : "Já coberto este mês",
      tone: missingToBreakeven ? "warning" : undefined,
    },
    {
      title: "Menor saldo em 90 dias",
      value: brl(projection.lowest.balance),
      hint: `Em ${projection.lowest.date.slice(8, 10)}/${projection.lowest.date.slice(5, 7)}`,
      tone: projection.lowest.balance < 0 ? "danger" : undefined,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.title}
          className={cn(
            "rounded-[22px] border bg-surface p-5",
            card.tone === "danger" ? "border-danger/40" : "border-line"
          )}
        >
          <p className="text-xs text-muted-foreground">{card.title}</p>
          <p
            className={cn(
              "mt-1 truncate text-2xl font-semibold tabular-nums",
              card.tone === "danger"
                ? "text-danger"
                : card.tone === "success"
                  ? "text-success"
                  : "text-foreground"
            )}
          >
            {card.value}
          </p>
          <p
            className={cn(
              "mt-1 text-[11px]",
              card.tone === "warning" ? "text-warning" : "text-faint"
            )}
          >
            {card.hint}
          </p>
        </div>
      ))}
    </section>
  );
}
