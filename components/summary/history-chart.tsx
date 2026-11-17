"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  chartAxisStroke,
  chartAxisTick,
  chartCursorFill,
  chartGridStroke,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from "@/lib/chart-theme";
import type { HistoryPoint } from "@/lib/monthly-summary-core";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const compact = (v: number) => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

/** Entrou x saiu dos últimos 6 meses; o mês do resumo fica em destaque. */
export function HistoryChart({ data, month }: { data: HistoryPoint[]; month: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }} barGap={3}>
          <CartesianGrid vertical={false} stroke={chartGridStroke} />
          <XAxis dataKey="label" tick={chartAxisTick} stroke={chartAxisStroke} tickLine={false} />
          <YAxis tickFormatter={compact} tick={chartAxisTick} stroke={chartAxisStroke} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: chartCursorFill }}
            contentStyle={chartTooltipStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            formatter={(value, name) => [brl(Number(value)), name === "income" ? "Entrou" : "Saiu"]}
          />
          <Bar dataKey="income" radius={[6, 6, 0, 0]} maxBarSize={22}>
            {data.map((d) => (
              <Cell key={d.month} fill="var(--success)" fillOpacity={d.month === month ? 1 : 0.35} />
            ))}
          </Bar>
          <Bar dataKey="expense" radius={[6, 6, 0, 0]} maxBarSize={22}>
            {data.map((d) => (
              <Cell key={d.month} fill="var(--brand)" fillOpacity={d.month === month ? 1 : 0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
