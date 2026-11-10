import { brl } from "@/components/business/format";
import type { RaioXData } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

import { RxCard } from "./rx-card";

export function ChangesCard({
  changes,
  pace,
}: {
  changes: RaioXData["changes"];
  pace: RaioXData["pace"];
}) {
  const progress = pace.average ? Math.min(100, (pace.sofar / pace.average) * 100) : null;

  return (
    <RxCard title="O que mudou" description="Últimos 30 dias comparados com a sua média dos 3 meses anteriores">
      {!changes.hasBase ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">
          Precisa de pelo menos um mês de histórico para comparar.
        </p>
      ) : changes.list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma mudança relevante por categoria.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-faint">
              <th className="pb-2 text-left font-medium">Categoria</th>
              <th className="pb-2 text-right font-medium">Média</th>
              <th className="pb-2 text-right font-medium">30 dias</th>
              <th className="pb-2 text-right font-medium">Variação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {changes.list.map((c) => (
              <tr key={c.category}>
                <td className="py-2.5 pr-2 font-medium text-foreground">{c.category}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{brl(c.average)}</td>
                <td className="py-2.5 text-right tabular-nums text-foreground">{brl(c.recent)}</td>
                <td
                  className={cn(
                    "py-2.5 text-right font-semibold tabular-nums",
                    c.diff > 0 ? "text-danger" : "text-success"
                  )}
                >
                  {c.change === null ? "novo" : `${c.change > 0 ? "+" : ""}${c.change}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-5 rounded-2xl border border-line bg-tint p-3.5">
        <p className="text-xs text-muted-foreground">
          Saídas no mês até agora <b className="text-foreground">{brl(pace.sofar)}</b>
          {pace.average !== null && (
            <>
              {" "}
              · média mensal <b className="text-foreground">{brl(pace.average)}</b>
            </>
          )}
        </p>
        {progress !== null && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint-strong">
            <div
              className={cn(
                "h-full rounded-full",
                pace.vsAverage !== null && pace.vsAverage > 5
                  ? "bg-danger"
                  : "bg-gradient-to-r from-brand to-brand-bright"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-faint">
          {pace.vsAverage === null || pace.dayRef < 7
            ? `Faltam ${pace.daysLeft} dias no mês`
            : `No ritmo atual, o mês fecha em ${brl(pace.projected)} (${
                pace.vsAverage > 0 ? `${pace.vsAverage}% acima` : pace.vsAverage < 0 ? `${-pace.vsAverage}% abaixo` : "igual"
              } da média) · faltam ${pace.daysLeft} dias`}
        </p>
      </div>
    </RxCard>
  );
}
