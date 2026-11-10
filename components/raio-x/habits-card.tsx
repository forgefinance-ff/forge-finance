import { brl } from "@/components/business/format";
import type { HabitTag, RxScope } from "@/lib/raio-x-calc";
import type { RaioXData } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

import { RxCard, RxInsight } from "./rx-card";

const TAG: Record<Exclude<HabitTag, null>, { label: string; className: string; bar: string }> = {
  subscription: { label: "fixo todo mês", className: "bg-brand/15 text-brand-soft", bar: "bg-brand-bright" },
  rising: { label: "subindo", className: "bg-danger/15 text-danger", bar: "bg-danger" },
  small: { label: "pequeno e frequente", className: "bg-warning/15 text-warning", bar: "bg-warning" },
};

function freq(perMonth: number) {
  if (perMonth >= 1.5) return `${perMonth.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}× por mês`;
  return "1× por mês";
}

export function HabitsCard({ habits, scope }: { habits: RaioXData["habits"]; scope: RxScope }) {
  const max = Math.max(...habits.list.map((h) => h.monthly), 1);
  const small = habits.list.filter((h) => h.tag === "small");
  const smallYear = small.reduce((s, h) => s + h.yearly, 0);

  return (
    <RxCard
      title={scope === "business" ? "Gastos que se repetem" : "Hábitos que se repetem"}
      description="Mesmo lugar ou mesma descrição aparecendo várias vezes nos últimos 90 dias"
      badge="Custo no ano"
    >
      {habits.list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum gasto se repetiu o bastante nos últimos 90 dias. Com mais lançamentos, os hábitos aparecem aqui.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {habits.list.map((h) => {
            const tag = h.tag ? TAG[h.tag] : null;
            return (
              <li key={h.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-foreground">
                    <span className="truncate">{h.label}</span>
                    {tag && (
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold", tag.className)}>
                        {h.tag === "rising" && h.change ? `subiu ${h.change}%` : tag.label}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-faint">
                    {[h.category, freq(h.perMonth), `~${brl(h.average)} cada`].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint-strong">
                    <div
                      className={cn("h-full rounded-full", tag?.bar ?? "bg-brand/70")}
                      style={{ width: `${Math.max(4, (h.monthly / max) * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-right text-sm font-semibold tabular-nums text-foreground">
                  {brl(h.monthly)}
                  <span className="block text-[11px] font-normal text-faint">por mês</span>
                </p>
                <p className="hidden text-right text-sm font-semibold tabular-nums text-foreground sm:block">
                  {brl(h.yearly)}
                  <span className="block text-[11px] font-normal text-faint">por ano</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {small.length > 0 && (
        <RxInsight>
          Gastos pequenos e frequentes ({small.map((h) => h.label).slice(0, 2).join(", ")}
          {small.length > 2 ? "…" : ""}) somam <b className="text-foreground">{brl(smallYear)} por ano</b>. Um por um
          parecem pouco; juntos, não.
        </RxInsight>
      )}
    </RxCard>
  );
}
