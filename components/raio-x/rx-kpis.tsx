import { brl } from "@/components/business/format";
import { WEEKDAYS } from "@/lib/raio-x-calc";
import type { RaioXData } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

type Kpi = { title: string; value: string; extra?: string; hint: string; tone?: "warning" | "danger" | "success" };

export function RxKpis({ data }: { data: RaioXData }) {
  const { weekday, habits, changes, noSpend, scope } = data;

  const cards: Kpi[] = [
    {
      title: "Dia da semana mais caro",
      value: weekday.hasData ? WEEKDAYS[weekday.top] : "—",
      extra: weekday.hasData ? `${brl(weekday.topAverage)} em média` : undefined,
      hint:
        weekday.ratio && weekday.ratio > 1.05
          ? `${weekday.ratio.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× a média dos outros dias`
          : "Gastos bem distribuídos na semana",
    },
    {
      title: scope === "business" ? "Gastos que se repetem" : "Hábitos que se repetem",
      value: habits.list.length ? brl(habits.monthlyTotal) : "—",
      extra: habits.list.length ? "/mês" : undefined,
      hint: habits.list.length
        ? `${habits.list.length} ${habits.list.length === 1 ? "hábito" : "hábitos"} · ${brl(habits.monthlyTotal * 12)} por ano`
        : "Nenhum gasto repetido nos últimos 90 dias",
      tone: habits.list.length ? "warning" : undefined,
    },
    {
      title: "Categoria que mais subiu",
      value: changes.top ? changes.top.category : "—",
      extra: changes.top?.change != null ? `+${changes.top.change}%` : undefined,
      hint: changes.top
        ? `${brl(changes.top.diff)} a mais que a média (30 dias)`
        : changes.hasBase
          ? "Nenhuma categoria acima da média"
          : "Precisa de mais um mês de dados para comparar",
      tone: changes.top ? "danger" : undefined,
    },
    noSpend
      ? {
          title: "Dias sem gastar no mês",
          value: noSpend.daysCounted ? `${noSpend.daysWithout}` : "—",
          extra: noSpend.daysCounted ? `de ${noSpend.daysCounted} dias` : undefined,
          hint:
            noSpend.streak > 0
              ? `Sequência atual: ${noSpend.streak} ${noSpend.streak === 1 ? "dia" : "dias"} · recorde ${noSpend.best}`
              : `Recorde do mês: ${noSpend.best} ${noSpend.best === 1 ? "dia seguido" : "dias seguidos"}`,
          tone: noSpend.daysWithout > 0 ? "success" : undefined,
        }
      : {
          title: "Saída média por dia útil",
          value: brl(data.workdayAvg),
          hint: "Segunda a sexta, últimas 13 semanas",
        },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.title} className="rounded-[22px] border border-line bg-surface p-5">
          <p className="text-xs text-muted-foreground">{card.title}</p>
          <p
            className={cn(
              "mt-2 truncate text-2xl font-bold text-foreground",
              card.tone === "warning" && "text-warning",
              card.tone === "danger" && "text-danger",
              card.tone === "success" && "text-success"
            )}
          >
            {card.value}
            {card.extra && (
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">{card.extra}</span>
            )}
          </p>
          <p className="mt-1.5 text-xs text-faint">{card.hint}</p>
        </div>
      ))}
    </section>
  );
}
