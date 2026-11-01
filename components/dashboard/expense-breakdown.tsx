import type { CategorySlice } from "@/lib/dashboard-analytics";
import { formatCurrency } from "@/lib/formatters";

type ExpenseBreakdownProps = {
  slices: CategorySlice[];
  total: number;
};

export function ExpenseBreakdown({ slices, total }: ExpenseBreakdownProps) {
  const visible = slices.slice(0, 5);

  return (
    <section className="forge-panel p-5">
      <div className="flex items-center justify-between">
        <p className="forge-panel-title">Despesas por categoria</p>
        <span className="text-[11px] text-zinc-500">Mês atual</span>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 text-center text-xs text-zinc-500">
          Nenhuma despesa registrada neste mês.
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {visible.map((slice) => {
            const pct = total > 0 ? (slice.value / total) * 100 : 0;

            return (
              <li key={slice.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-zinc-100">{slice.name}</span>
                  <span className="shrink-0 tabular-nums text-zinc-300">
                    {formatCurrency(slice.value)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-soft"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] text-zinc-500">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
