"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import {
  chartAxisStroke,
  chartAxisTick,
  chartCursorFill,
  chartGridStroke,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from "@/lib/chart-theme";

export type Slice = { name: string; value: number; color: string };

/** Barras de cadastros por dia. */
export function SignupsChart({ data }: { data: { day: string; count: number }[] }) {
  const points = data.map((d) => ({
    label: `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`,
    count: d.count,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={chartGridStroke} />
          <XAxis dataKey="label" tick={chartAxisTick} stroke={chartAxisStroke} tickLine={false} interval={1} />
          <YAxis allowDecimals={false} tick={chartAxisTick} stroke={chartAxisStroke} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: chartCursorFill }}
            contentStyle={chartTooltipStyle}
            labelStyle={chartTooltipLabelStyle}
            itemStyle={chartTooltipItemStyle}
            formatter={(value) => [value, "Cadastros"]}
          />
          <Bar dataKey="count" fill="var(--brand)" radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Rosca com legenda ao lado. */
export function DonutChart({ data, center, centerLabel }: { data: Slice[]; center: string; centerLabel: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const visible = total ? data.filter((d) => d.value > 0) : [{ name: "Sem dados", value: 1, color: "var(--line-strong)" }];

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={visible} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={visible.length > 1 ? 2 : 0} stroke="none">
              {visible.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            {total > 0 && <Tooltip contentStyle={chartTooltipStyle} itemStyle={chartTooltipItemStyle} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{center}</span>
          <span className="text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} aria-hidden />
              {slice.name}
            </span>
            <span className="tabular-nums text-foreground">
              {slice.value}
              <span className="ml-1.5 text-xs text-muted-foreground">{total ? `${Math.round((slice.value / total) * 100)}%` : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
