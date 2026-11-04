"use client";

import { useState, useTransition } from "react";
import { PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { saveBusinessGoals } from "@/app/actions/business";
import { Button } from "@/components/ui/button";
import type { DreMonth } from "@/lib/business-calc";
import { amountToInput } from "@/lib/money";
import { cn } from "@/lib/utils";

import { brl, pct, variation } from "./format";

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500";

type Props = {
  goals: { monthlyRevenue: number | null; targetMarginPct: number | null };
  current: DreMonth;
  previous: DreMonth;
  lastYear: DreMonth;
};

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-faint">—</span>;
  return (
    <span className={cn("font-medium", value >= 0 ? "text-success" : "text-danger")}>
      {value >= 0 ? "▲" : "▼"} {pct(Math.abs(value))}
    </span>
  );
}

export function GoalsIndicators({ goals, current, previous, lastYear }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const revenueProgress = goals.monthlyRevenue
    ? Math.min((current.revenue / goals.monthlyRevenue) * 100, 100)
    : null;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveBusinessGoals(formData);
      if (result.ok) {
        toast.success("Metas salvas.");
        setEditing(false);
      } else toast.error(result.error);
    });
  }

  const indicators = [
    { label: "Faturamento", now: current.revenue, prev: previous.revenue, ly: lastYear.revenue, money: true },
    { label: "Lucro", now: current.profit, prev: previous.profit, ly: lastYear.profit, money: true },
    { label: "Número de vendas", now: current.salesCount, prev: previous.salesCount, ly: lastYear.salesCount, money: false },
    {
      label: "Ticket médio",
      now: current.averageTicket ?? 0,
      prev: previous.averageTicket ?? 0,
      ly: lastYear.averageTicket ?? 0,
      money: true,
    },
  ];

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Metas e indicadores</h2>
          <p className="text-sm text-muted-foreground">
            Mês atual comparado com o mês anterior ({previous.label}) e com o mesmo mês do ano
            passado ({lastYear.label}).
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
          <PencilIcon className="h-4 w-4" />
          {editing ? "Fechar" : "Definir metas"}
        </Button>
      </div>

      {editing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="mt-4 grid gap-3 rounded-2xl border border-line bg-tint p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-faint">Meta de faturamento mensal (R$)</span>
            <input
              name="monthly_revenue_goal"
              inputMode="decimal"
              defaultValue={amountToInput(goals.monthlyRevenue)}
              placeholder="Ex.: 10.000,00"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-faint">Margem de lucro desejada (%)</span>
            <input
              name="target_margin_pct"
              inputMode="decimal"
              defaultValue={goals.targetMarginPct ? String(goals.targetMarginPct).replace(".", ",") : ""}
              placeholder="Ex.: 25"
              className={inputClass}
            />
          </label>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-tint p-4">
          <p className="text-xs text-faint">Meta de faturamento do mês</p>
          {goals.monthlyRevenue ? (
            <>
              <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
                {brl(current.revenue)}{" "}
                <span className="text-sm font-normal text-faint">de {brl(goals.monthlyRevenue)}</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-tint-strong">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-brand-indigo"
                  style={{ width: `${revenueProgress ?? 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-faint">
                {current.revenue >= goals.monthlyRevenue
                  ? "Meta batida!"
                  : `Faltam ${brl(goals.monthlyRevenue - current.revenue)}`}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Defina uma meta para acompanhar.</p>
          )}
        </div>

        <div className="rounded-2xl border border-line bg-tint p-4">
          <p className="text-xs text-faint">Margem de lucro do mês</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {pct(current.profitPct)}
            {goals.targetMarginPct && (
              <span className="text-sm font-normal text-faint"> · meta {pct(goals.targetMarginPct)}</span>
            )}
          </p>
          {goals.targetMarginPct && current.profitPct !== null && (
            <p
              className={cn(
                "mt-1 text-xs",
                current.profitPct >= goals.targetMarginPct ? "text-success" : "text-warning"
              )}
            >
              {current.profitPct >= goals.targetMarginPct
                ? "Dentro da meta."
                : `Abaixo da meta em ${pct(goals.targetMarginPct - current.profitPct)}.`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-faint">
              <th className="py-2 text-left font-semibold">Indicador</th>
              <th className="py-2 text-right font-semibold">{current.label}</th>
              <th className="py-2 text-right font-semibold">vs {previous.label}</th>
              <th className="py-2 text-right font-semibold">vs {lastYear.label}</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((row) => (
              <tr key={row.label} className="border-b border-line/60">
                <td className="py-2 text-text-soft">{row.label}</td>
                <td className="py-2 text-right font-semibold tabular-nums text-foreground">
                  {row.money ? brl(row.now) : row.now}
                </td>
                <td className="py-2 text-right tabular-nums">
                  <Change value={variation(row.now, row.prev)} />
                </td>
                <td className="py-2 text-right tabular-nums">
                  <Change value={variation(row.now, row.ly)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-faint">
        O mês atual ainda está em andamento: compare com cuidado até o fechamento.
      </p>
    </section>
  );
}
