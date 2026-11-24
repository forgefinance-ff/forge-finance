// Gráficos do Relatório completo: SVG e HTML simples, sem JavaScript no
// navegador, para sair certo na impressão e no PDF.
import type { CashPoint } from "@/lib/business-calc";
import type { SeriesPoint, Slice, WeekdayStat } from "@/lib/full-report-core";

export const REPORT_COLORS = {
  income: "#16a34a",
  expense: "#7c3aed",
  danger: "#dc2626",
  muted: "#cbd5e1",
};

const PALETTE = [
  "#6d28d9",
  "#8b5cf6",
  "#a78bfa",
  "#4f46e5",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
];

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function colorOf(slice: Slice, index: number) {
  return slice.name === "Outras" ? REPORT_COLORS.muted : PALETTE[index % PALETTE.length];
}

/** Receitas x despesas por mês (barras lado a lado). */
export function MonthlyBars({ data }: { data: SeriesPoint[] }) {
  if (data.length === 0) return <p className="rpt-empty">Sem lançamentos nos últimos 12 meses.</p>;

  const W = 640;
  const H = 230;
  const left = 46;
  const bottom = 26;
  const top = 12;
  const plotW = W - left - 8;
  const plotH = H - top - bottom;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const slot = plotW / data.length;
  const barW = Math.min(22, slot / 2.6);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpt-chart" role="img" aria-label="Receitas e despesas por mês">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={W - 8} y1={y(max * t)} y2={y(max * t)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={left - 6} y={y(max * t) + 3} textAnchor="end" fontSize={9} fill="#64748b">
            {compact.format(max * t)}
          </text>
        </g>
      ))}
      {data.map((d, i) => {
        const cx = left + slot * i + slot / 2;
        return (
          <g key={d.key}>
            <rect
              x={cx - barW - 1}
              y={y(d.income)}
              width={barW}
              height={Math.max(0, top + plotH - y(d.income))}
              rx={3}
              fill={REPORT_COLORS.income}
            />
            <rect
              x={cx + 1}
              y={y(d.expense)}
              width={barW}
              height={Math.max(0, top + plotH - y(d.expense))}
              rx={3}
              fill={REPORT_COLORS.expense}
            />
            <text x={cx} y={H - 9} textAnchor="middle" fontSize={9.5} fill="#475569">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Rosca de categorias com legenda ao lado. */
export function CategoryDonut({ slices, total, title }: { slices: Slice[]; total: number; title: string }) {
  if (slices.length === 0) return <p className="rpt-empty">Sem lançamentos neste período.</p>;

  const R = 70;
  const C = 2 * Math.PI * R;
  const arcs = slices.map((s, i) => ({
    slice: s,
    index: i,
    length: (s.share / 100) * C,
    start: slices.slice(0, i).reduce((sum, x) => sum + (x.share / 100) * C, 0),
  }));

  return (
    <div className="rpt-donut">
      <svg viewBox="0 0 200 200" className="rpt-donut-svg" role="img" aria-label={title}>
        <circle cx={100} cy={100} r={R} fill="none" stroke="#f1f5f9" strokeWidth={28} />
        {arcs.map((a) => (
          <circle
            key={a.slice.name}
            cx={100}
            cy={100}
            r={R}
            fill="none"
            stroke={colorOf(a.slice, a.index)}
            strokeWidth={28}
            strokeDasharray={`${a.length} ${C - a.length}`}
            strokeDashoffset={-a.start}
            transform="rotate(-90 100 100)"
          />
        ))}
        <text x={100} y={96} textAnchor="middle" fontSize={11} fill="#64748b">
          Total
        </text>
        <text x={100} y={114} textAnchor="middle" fontSize={14} fontWeight={700} fill="#0f172a">
          {compact.format(total)}
        </text>
      </svg>

      <ul className="rpt-legend">
        {slices.map((s, i) => (
          <li key={s.name}>
            <span className="rpt-dot" style={{ background: colorOf(s, i) }} />
            <span className="rpt-legend-name">{s.name}</span>
            <span className="rpt-legend-value">{full.format(s.value)}</span>
            <span className="rpt-legend-pct">{s.share.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Gasto por dia da semana; o dia mais forte fica destacado. */
export function WeekdayBars({ data }: { data: WeekdayStat[] }) {
  const max = Math.max(...data.map((d) => d.total));
  if (!(max > 0)) return <p className="rpt-empty">Sem despesas para comparar.</p>;

  return (
    <div className="rpt-weekdays">
      {data.map((d) => {
        const top = d.total === max;
        return (
          <div key={d.index} className="rpt-weekday">
            <span className="rpt-weekday-value">{compact.format(d.total)}</span>
            <div className="rpt-weekday-track">
              <div
                className="rpt-weekday-bar"
                style={{
                  height: `${Math.max(3, (d.total / max) * 100)}%`,
                  background: top ? "#6d28d9" : "#c4b5fd",
                }}
              />
            </div>
            <span className={top ? "rpt-weekday-label rpt-strong" : "rpt-weekday-label"}>{d.short}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Lista ranqueada com barra de proporção (maiores gastos, clientes...). */
export function RankedBars({
  items,
  color = "#6d28d9",
}: {
  items: { label: string; sublabel?: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="rpt-ranked">
      {items.map((item, i) => (
        <li key={`${item.label}-${i}`}>
          <div className="rpt-ranked-head">
            <span className="rpt-ranked-label">
              {item.label}
              {item.sublabel ? <small>{item.sublabel}</small> : null}
            </span>
            <span className="rpt-ranked-value">{full.format(item.value)}</span>
          </div>
          <div className="rpt-ranked-track">
            <div className="rpt-ranked-bar" style={{ width: `${(item.value / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Saldo projetado da empresa nos próximos dias (linha + área). */
export function CashLine({ points }: { points: CashPoint[] }) {
  if (points.length < 2) return <p className="rpt-empty">Sem dados suficientes para projetar.</p>;

  const W = 640;
  const H = 200;
  const left = 50;
  const right = 10;
  const top = 12;
  const bottom = 24;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const values = points.map((p) => p.balance);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;
  const x = (i: number) => left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => top + plotH - ((v - min) / range) * plotH;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const ticks = [0, 0.5, 1];
  const labelAt = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="rpt-chart" role="img" aria-label="Saldo projetado da empresa">
      {ticks.map((t) => {
        const v = min + range * t;
        return (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={left - 6} y={y(v) + 3} textAnchor="end" fontSize={9} fill="#64748b">
              {compact.format(v)}
            </text>
          </g>
        );
      })}
      {min < 0 ? <line x1={left} x2={W - right} y1={y(0)} y2={y(0)} stroke={REPORT_COLORS.danger} strokeDasharray="4 3" /> : null}
      <path d={area} fill="#6d28d9" fillOpacity={0.12} />
      <path d={line} fill="none" stroke="#6d28d9" strokeWidth={2.2} strokeLinejoin="round" />
      {labelAt.map((i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={9.5} fill="#475569">
          {points[i].label}
        </text>
      ))}
    </svg>
  );
}
