import type { CategorySlice } from "@/lib/dashboard-analytics";
import { formatCurrency } from "@/lib/formatters";

type ExpenseBreakdownProps = {
  slices: CategorySlice[];
  total: number;
};

export function ExpenseBreakdown({ slices, total }: ExpenseBreakdownProps) {
  const visible = slices.slice(0, 5);

  return (
    <section className="forge-panel h-full p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="forge-panel-title">Para onde foi o dinheiro</h2>
        <span className="text-xs text-muted-foreground">Este mês</span>
      </div>

      {visible.length === 0 ? (
        <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-line px-4 text-center text-xs text-faint">
          Nenhuma despesa registrada neste mês.
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {visible.map((slice, index) => {
            const pct = total > 0 ? (slice.value / total) * 100 : 0;

            return (
              <li key={slice.name} className="t-reveal-item" style={{ "--i": index } as React.CSSProperties}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-foreground">{slice.name}</span>
                  <span className="shrink-0 tabular-nums text-text-soft">
                    {formatCurrency(slice.value)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-tint-strong">
                    <div
                      className="t-bar-grow h-full rounded-full bg-brand"
                      
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] text-faint">
                    {pct > 0 && pct < 1 ? "<1%" : `${pct.toFixed(0)}%`}
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
