import type { HeatmapCell } from "@/lib/dashboard-analytics";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type ActivityHeatmapProps = {
  cells: HeatmapCell[];
  weeks: number;
};

const levelClasses = [
  "bg-white/[0.05]",
  "bg-brand/30",
  "bg-brand/55",
  "bg-brand-bright/80",
  "bg-brand-soft",
];

function levelFor(count: number, max: number) {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function formatDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function ActivityHeatmap({ cells, weeks }: ActivityHeatmapProps) {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const max = Math.max(0, ...cells.map((c) => c.count));
  const totalCount = cells.reduce((acc, c) => acc + c.count, 0);

  return (
    <section className="forge-panel p-5">
      <div className="flex items-center justify-between">
        <p className="forge-panel-title">Atividade financeira</p>
        <span className="text-[11px] text-zinc-500">Últimas {weeks} semanas</span>
      </div>

      {totalCount === 0 ? (
        <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 text-center text-xs text-zinc-500">
          Sem transações neste período para montar o mapa de atividade.
        </div>
      ) : (
        <>
          <div
            className="mt-4 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(7, auto)",
              gridAutoFlow: "column",
            }}
            role="img"
            aria-label={`Mapa de atividade com ${totalCount} transações nas últimas ${weeks} semanas`}
          >
            {cells.map((cell) => {
              const future = cell.date > todayKey;
              const label = future
                ? formatDay(cell.date)
                : `${formatDay(cell.date)} — ${cell.count} transação(ões), movimentado ${formatCurrency(cell.total)}`;

              return (
                <div
                  key={cell.date}
                  title={label}
                  className={cn(
                    "aspect-square rounded-[4px] transition-transform hover:scale-125",
                    future ? "bg-transparent" : levelClasses[levelFor(cell.count, max)]
                  )}
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{totalCount} transações no período</span>
            <span className="flex items-center gap-1">
              Menos
              {levelClasses.map((c) => (
                <span key={c} className={cn("h-2.5 w-2.5 rounded-[3px]", c)} />
              ))}
              Mais
            </span>
          </div>
        </>
      )}
    </section>
  );
}
