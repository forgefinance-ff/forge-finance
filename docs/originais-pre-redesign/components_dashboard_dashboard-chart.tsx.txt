"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { ChartPoint } from "@/lib/dashboard";

type DashboardChartProps = {
  chart7d: ChartPoint[];
  chart30d: ChartPoint[];
  chart12m: ChartPoint[];
};

type Period = "12M" | "30D" | "7D";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardChart({
  chart7d,
  chart30d,
  chart12m,
}: DashboardChartProps) {
  const [period, setPeriod] = useState<Period>("12M");

  const data = useMemo(() => {
    if (period === "7D") return chart7d;
    if (period === "30D") return chart30d;
    return chart12m;
  }, [period, chart7d, chart30d, chart12m]);

  const totalIncome = data.reduce((acc, item) => acc + item.receitas, 0);
  const totalExpense = data.reduce((acc, item) => acc + item.despesas, 0);

  const periods: Period[] = ["12M", "30D", "7D"];

  return (
    <section className="rounded-3xl border border-white/10 bg-[#111827]">
      <div className="flex flex-col gap-6 border-b border-white/10 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Fluxo Financeiro
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Receitas e despesas ao longo do período
          </p>
        </div>

        <div className="flex gap-2">
          {periods.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                period === item
                  ? "bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-violet-900/30"
                  : "border border-white/10 text-slate-400 hover:bg-white/5"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 border-b border-white/10 p-6 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-400">Receitas acumuladas</p>

          <h3 className="mt-2 text-2xl font-bold text-emerald-400">
            {formatCurrency(totalIncome)}
          </h3>
        </div>

        <div>
          <p className="text-sm text-slate-400">Despesas acumuladas</p>

          <h3 className="mt-2 text-2xl font-bold text-rose-400">
            {formatCurrency(totalExpense)}
          </h3>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            Receitas
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            Despesas
          </div>
        </div>

        {data.every((item) => item.receitas === 0 && item.despesas === 0) ? (
          <div className="flex h-[280px] items-center justify-center text-center text-sm text-slate-500">
            Nenhuma movimentação neste período.
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1F2937" vertical={false} />

                <XAxis
                  dataKey="label"
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />

                <YAxis
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(Number(value))}
                />

                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: 16,
                  }}
                />

                <Area
                  dataKey="receitas"
                  type="monotone"
                  stroke="#10B981"
                  strokeWidth={3}
                  fill="url(#income)"
                />

                <Area
                  dataKey="despesas"
                  type="monotone"
                  stroke="#F43F5E"
                  strokeWidth={3}
                  fill="url(#expense)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
