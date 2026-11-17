"use client";

import { useState } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, HashIcon, TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";

import { formatCurrency } from "@/lib/formatters";
import { PERIODS, percentChange, periodStats, type PeriodKey, type PeriodRow } from "@/lib/period-stats";
import { cn } from "@/lib/utils";

type Metric = {
  label: string;
  icon: typeof WalletIcon;
  value: number;
  previous: number | null;
  money: boolean;
  /** Subir é bom (entradas, resultado) ou ruim (saídas)? */
  upIsGood: boolean;
};

function Change({ metric }: { metric: Metric }) {
  if (metric.previous === null) return null;
  const change = percentChange(metric.value, metric.previous);
  if (change === null || !Number.isFinite(change)) return null;

  const rounded = Math.round(change);
  if (rounded === 0) {
    return <span className="text-xs font-medium text-faint">= 0%</span>;
  }

  const up = rounded > 0;
  const good = up === metric.upIsGood;
  const Icon = up ? ArrowUpRightIcon : ArrowDownRightIcon;

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums", good ? "text-success" : "text-danger")}>
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {Math.abs(rounded)}%
    </span>
  );
}

/**
 * Faixa do topo do dashboard: escolhe o período em pílulas e mostra quanto
 * entrou, saiu, sobrou e quantos lançamentos, com a variação contra o
 * período anterior equivalente.
 */
export function PeriodStats({ rows, today }: { rows: PeriodRow[]; today: string }) {
  const [key, setKey] = useState<PeriodKey>("month");
  const period = PERIODS.find((p) => p.key === key)!;
  const { current, previous } = periodStats(rows, key, today);

  const metrics: Metric[] = [
    { label: "Entradas", icon: TrendingUpIcon, value: current.income, previous: previous?.income ?? null, money: true, upIsGood: true },
    { label: "Saídas", icon: TrendingDownIcon, value: current.expense, previous: previous?.expense ?? null, money: true, upIsGood: false },
    { label: "Sobrou", icon: WalletIcon, value: current.result, previous: previous?.result ?? null, money: true, upIsGood: true },
    { label: "Lançamentos", icon: HashIcon, value: current.count, previous: previous?.count ?? null, money: false, upIsGood: true },
  ];

  return (
    <section aria-label="Resumo por período" className="space-y-3">
      <div role="radiogroup" aria-label="Período" className="flex flex-wrap gap-2">
        {PERIODS.map((option) => {
          const active = option.key === key;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setKey(option.key)}
              className={cn(
                "h-8 rounded-full border px-3.5 text-xs font-medium outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-brand",
                active
                  ? "border-transparent bg-accent font-semibold text-accent-foreground"
                  : "border-line text-text-soft hover:border-line-strong hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const negative = metric.money && metric.value < 0;
          return (
            <div key={metric.label} className="min-w-0 bg-surface-solid px-4 py-4 sm:px-5">
              <p className="flex items-center gap-1.5 text-xs font-medium text-faint sm:text-sm">
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                {metric.label}
              </p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    "truncate text-xl font-semibold tabular-nums tracking-tight sm:text-2xl",
                    negative ? "text-danger" : "text-foreground"
                  )}
                >
                  {metric.money ? formatCurrency(metric.value) : metric.value}
                </span>
                <Change metric={metric} />
              </div>
            </div>
          );
        })}
      </div>

      {previous && (
        <p className="text-xs text-faint">Variação comparada com {period.compare}.</p>
      )}
    </section>
  );
}
