"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CashProjection } from "@/lib/business-calc";
import {
  chartAxisStroke,
  chartAxisTick,
  chartGridStroke,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from "@/lib/chart-theme";
import { cn } from "@/lib/utils";

import { brl } from "./format";

const PERIODS = [30, 60, 90] as const;

function compact(value: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function CashProjectionCard({
  projection,
  today,
}: {
  projection: CashProjection;
  today: string;
}) {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);

  const points = useMemo(() => projection.points.slice(0, days + 1), [projection.points, days]);
  const end = points[points.length - 1];
  const events = projection.events.filter((e) => e.date <= (end?.date ?? today));
  const lowest = points.reduce(
    (min, p) => (p.balance < min.balance ? p : min),
    points[0] ?? { date: today, label: "", balance: 0 }
  );
  const inflow = events.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const outflow = events.filter((e) => e.amount < 0).reduce((s, e) => s - e.amount, 0);

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Fluxo de caixa projetado</h2>
          <p className="text-sm text-muted-foreground">
            Saldo de hoje + contas a receber − contas a pagar. Atrasadas entram hoje; contas
            mensais são repetidas nos próximos meses.
          </p>
        </div>
        <div role="tablist" className="flex self-start rounded-xl border border-line bg-tint p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={days === p}
              onClick={() => setDays(p)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                days === p ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-4">
        <Stat label="Saldo hoje" value={brl(projection.startBalance)} />
        <Stat label="Vai entrar" value={brl(inflow)} tone="success" />
        <Stat label="Vai sair" value={brl(outflow)} tone="danger" />
        <Stat
          label={`Saldo em ${end?.label ?? ""}`}
          value={brl(end?.balance ?? projection.startBalance)}
          tone={(end?.balance ?? 0) < 0 ? "danger" : undefined}
        />
      </dl>

      {lowest.balance < 0 && (
        <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          O saldo chega a {brl(lowest.balance)} em {lowest.label}. Antecipe recebimentos,
          renegocie pagamentos ou segure retiradas até lá.
        </p>
      )}

      <div className="mt-5 h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ left: -8, right: 4 }}>
            <defs>
              <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              stroke={chartAxisStroke}
              tick={chartAxisTick}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke={chartAxisStroke}
              tick={chartAxisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => compact(Number(v))}
            />
            <ReferenceLine y={0} stroke="#f43f5e" strokeDasharray="4 4" />
            <Tooltip
              formatter={(value) => [brl(Number(value)), "Saldo"]}
              contentStyle={chartTooltipStyle}
              labelStyle={chartTooltipLabelStyle}
              itemStyle={chartTooltipItemStyle}
            />
            <Area type="stepAfter" dataKey="balance" stroke="#a855f7" strokeWidth={2} fill="url(#cashFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-foreground">Próximos movimentos</h3>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-faint">
          Nenhuma conta a pagar ou receber nesse período. Cadastre em Contas a pagar/receber para
          a projeção ficar completa.
        </p>
      ) : (
        <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
          {events.slice(0, 40).map((e, i) => (
            <li key={`${e.date}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate text-foreground">{e.description}</p>
                <p className="text-xs text-faint">
                  {e.date.slice(8, 10)}/{e.date.slice(5, 7)} ·{" "}
                  {e.kind === "receivable" ? "a receber" : "a pagar"}
                  {e.overdue && <span className="font-semibold text-danger"> · atrasada</span>}
                  {e.projected && <span> · recorrente (prevista)</span>}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  e.amount >= 0 ? "text-success" : "text-danger"
                )}
              >
                {e.amount >= 0 ? "+" : "−"} {brl(Math.abs(e.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  return (
    <div className="rounded-2xl border border-line bg-tint p-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-semibold tabular-nums",
          tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
