import { brl } from "@/components/business/format";
import { WEEKDAYS, WEEKDAYS_SHORT } from "@/lib/raio-x-calc";
import type { RaioXData } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

import { RxCard, RxInsight } from "./rx-card";

export function WeekdayCard({ weekday }: { weekday: RaioXData["weekday"] }) {
  const max = Math.max(...weekday.averages, 1);
  const weekendAvg = (weekday.averages[5] + weekday.averages[6]) / 2;
  const weekAvg = weekday.averages.slice(0, 5).reduce((s, v) => s + v, 0) / 5;

  return (
    <RxCard
      title="Quanto sai em cada dia da semana"
      description="Média de saídas por dia, nas últimas 13 semanas"
    >
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {weekday.averages.map((value, i) => {
          const isTop = i === weekday.top && weekday.hasData;
          return (
            <div key={WEEKDAYS_SHORT[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className={cn("text-[11px] tabular-nums", isTop ? "font-semibold text-foreground" : "text-faint")}>
                {value >= 1000 ? `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : Math.round(value)}
              </span>
              <div
                title={`${WEEKDAYS[i]}: ${brl(value)} em média`}
                className={cn(
                  "w-full rounded-t-lg transition-all",
                  isTop ? "bg-brand-soft shadow-[0_0_18px_-4px_var(--brand-bright)]" : "bg-brand/40"
                )}
                style={{ height: `${Math.max(3, (value / max) * 100)}%` }}
              />
              <span className={cn("text-xs", isTop ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {WEEKDAYS_SHORT[i]}
              </span>
            </div>
          );
        })}
      </div>

      {weekday.hasData && (
        <RxInsight>
          <b className="text-foreground">{WEEKDAYS[weekday.top]}</b> é o dia mais caro ({brl(weekday.topAverage)} em
          média).{" "}
          {weekendAvg > weekAvg * 1.1
            ? `No fim de semana sai ${Math.round((weekendAvg / (weekAvg || 1) - 1) * 100)}% a mais que nos dias úteis.`
            : weekAvg > 0 && weekendAvg < weekAvg * 0.9
              ? `No fim de semana sai ${Math.round((1 - weekendAvg / weekAvg) * 100)}% menos que nos dias úteis.`
              : "Dias úteis e fim de semana custam parecido."}
        </RxInsight>
      )}
    </RxCard>
  );
}
