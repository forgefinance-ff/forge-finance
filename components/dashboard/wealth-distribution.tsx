"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatCurrency } from "@/lib/formatters";

type Slice = { name: string; value: number };

type WealthDistributionProps = {
  slices: Slice[];
  negativeAccountsTotal: number;
};

const PALETTE = ["#7c3aed", "#c084fc", "#4f46e5", "#a855f7", "#818cf8", "#e879f9"];

export function WealthDistribution({
  slices,
  negativeAccountsTotal,
}: WealthDistributionProps) {
  const positive = slices.filter((s) => s.value > 0);
  const total = positive.reduce((acc, s) => acc + s.value, 0);

  return (
    <section className="forge-panel p-5">
      <div className="flex items-center justify-between">
        <p className="forge-panel-title">Distribuição patrimonial</p>
        <span className="text-[11px] text-zinc-500">Contas e investimentos</span>
      </div>

      {total <= 0 ? (
        <div className="mt-4 flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 text-center text-xs text-zinc-500">
          Cadastre contas com saldo ou investimentos para ver a distribuição.
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={positive}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={3}
                  cornerRadius={6}
                  stroke="none"
                >
                  {positive.map((slice, index) => (
                    <Cell key={slice.name} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid #3b2a5a",
                    borderRadius: 14,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Total
              </span>
              <span className="text-sm font-semibold text-white">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2">
            {positive.map((slice, index) => (
              <li
                key={slice.name}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: PALETTE[index % PALETTE.length] }}
                  />
                  <span className="truncate">{slice.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-zinc-400">
                  {((slice.value / total) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {negativeAccountsTotal < 0 && (
        <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300">
          Contas com saldo negativo ({formatCurrency(negativeAccountsTotal)}) não entram
          na rosca, mas reduzem o patrimônio total.
        </p>
      )}
    </section>
  );
}
