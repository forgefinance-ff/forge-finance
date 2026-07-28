"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardChartProps = {
  data: {
    month: string;
    receitas: number;
    despesas: number;
  }[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardChart({
  data,
}: DashboardChartProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#111827] p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">
          Fluxo Financeiro
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Receitas x Despesas por mês
        </p>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id="income"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#22c55e"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="#22c55e"
                  stopOpacity={0}
                />
              </linearGradient>

              <linearGradient
                id="expense"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="#ef4444"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="#ef4444"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke="#27272A"
              strokeDasharray="3 3"
            />

            <XAxis
              dataKey="month"
              stroke="#A1A1AA"
            />

            <YAxis
              stroke="#A1A1AA"
              tickFormatter={(value) => formatCurrency(Number(value ?? 0))}
            />

            <Tooltip
              formatter={(value) => [
                formatCurrency(Number(value ?? 0)),
                "",
              ]}
              contentStyle={{
                backgroundColor: "#18181B",
                border: "1px solid #27272A",
                borderRadius: 12,
                color: "#fff",
              }}
            />

            <Area
              type="monotone"
              dataKey="receitas"
              stroke="#22c55e"
              strokeWidth={3}
              fill="url(#income)"
            />

            <Area
              type="monotone"
              dataKey="despesas"
              stroke="#ef4444"
              strokeWidth={3}
              fill="url(#expense)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}