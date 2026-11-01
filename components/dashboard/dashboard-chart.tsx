"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartPoint } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type DashboardChartProps = {
  chart7d: ChartPoint[];
  chart30d: ChartPoint[];
  chart12m: ChartPoint[];
  totalBalance: number;
};

type Period = "7D" | "30D" | "12M";

const periods: { id: Period; label: string }[] = [
  { id: "7D", label: "7 dias" },
  { id: "30D", label: "30 dias" },
  { id: "12M", label: "12 meses" },
];

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function DashboardChart({
  chart7d,
  chart30d,
  chart12m,
  totalBalance,
}: DashboardChartProps) {
  const [period, setPeriod] = useState<Period>("12M");

  const data = useMemo(() => {
    if (period === "7D") return chart7d;
    if (period === "30D") return chart30d;
    return chart12m;
  }, [period, chart7d, chart30d, chart12m]);

  const income = data.reduce((acc, item) => acc + item.receitas, 0);
  const expense = data.reduce((acc, item) => acc + item.despesas, 0);
  const result = income - expense;
  const isEmpty = data.every((item) => item.receitas === 0 && item.despesas === 0);

  return (
    <section className="forge-panel flex flex-col p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="forge-panel-title">Patrimônio e fluxo de caixa</p>
          <p className="mt-3 text-xs text-zinc-400">Patrimônio atual</p>
          <p className="text-3xl font-semibold tracking-tight text-white">
            {formatCurrency(totalBalance)}
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Período do gráfico"
          className="flex self-start rounded-xl border border-white/[0.08] bg-black/30 p-1"
        >
          {periods.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={period === item.id}
              onClick={() => setPeriod(item.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                period === item.id
                  ? "bg-brand text-white shadow-[0_0_16px_rgba(124,58,237,0.5)]"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="text-xs text-zinc-400">Resultado no período</p>
          <p
            className={cn(
              "text-xl font-semibold",
              result >= 0 ? "text-emerald-300" : "text-rose-300"
            )}
          >
            {result >= 0 ? "+" : "−"}
            {formatCurrency(Math.abs(result))}
          </p>
        </div>
        <div className="flex items-center gap-4 pb-1 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-bright" />
            Receitas {formatCurrency(income)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            Despesas {formatCurrency(expense)}
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-6 flex h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 text-center">
          <p className="text-sm font-medium text-zinc-300">
            Nenhuma movimentação neste período
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Registre uma transação para ver o fluxo de caixa aqui.
          </p>
        </div>
      ) : (
        <div className="mt-4 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={3} margin={{ left: -8, right: 4 }}>
              <defs>
                <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#9f1239" />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#27272a" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#71717a"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={16}
              />
              <YAxis
                stroke="#71717a"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(value) => compactCurrency(Number(value))}
              />
              <Tooltip
                cursor={{ fill: "rgba(168,85,247,0.08)" }}
                formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3b2a5a",
                  borderRadius: 14,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
              />
              <Bar
                dataKey="receitas"
                name="Receitas"
                fill="url(#barIncome)"
                radius={[8, 8, 3, 3]}
                maxBarSize={22}
              />
              <Bar
                dataKey="despesas"
                name="Despesas"
                fill="url(#barExpense)"
                radius={[8, 8, 3, 3]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
