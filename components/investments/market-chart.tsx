"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type Candle = {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartMode = "line" | "candle";

type Props = {
  points: Candle[];
  mode: ChartMode;
  /** Fechamento anterior (gráfico de hoje): define a cor e vira linha tracejada. */
  previousClose?: number | null;
  /** "1d" e "5d" mostram hora; o resto, data. */
  intraday: boolean;
  formatPrice: (v: number) => string;
  live?: boolean;
  height?: number;
  className?: string;
};

const PAD = { top: 14, right: 72, bottom: 26, left: 8 };
const VOLUME_SHARE = 0.18;
const TZ = "America/Sao_Paulo";

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

const fmtVolume = (v: number) =>
  v >= 1e9
    ? `${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi`
    : v >= 1e6
      ? `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
      : v >= 1e3
        ? `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
        : v.toLocaleString("pt-BR");

export function MarketChart({
  points,
  mode,
  previousClose = null,
  intraday,
  formatPrice,
  live = false,
  height = 320,
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const gradientId = `mc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasVolume = points.some((p) => p.volume > 0);

  const geo = useMemo(() => {
    if (!width || points.length < 2) return null;
    const plotW = Math.max(10, width - PAD.left - PAD.right);
    const plotH = height - PAD.top - PAD.bottom;
    const priceH = hasVolume ? plotH * (1 - VOLUME_SHARE) - 6 : plotH;
    const volTop = PAD.top + priceH + 6;
    const volH = plotH - priceH - 6;

    let min = Infinity;
    let max = -Infinity;
    for (const p of points) {
      const lo = mode === "candle" ? p.low : p.close;
      const hi = mode === "candle" ? p.high : p.close;
      if (lo < min) min = lo;
      if (hi > max) max = hi;
    }
    if (previousClose != null) {
      min = Math.min(min, previousClose);
      max = Math.max(max, previousClose);
    }
    const padY = (max - min) * 0.08 || max * 0.01 || 1;
    min -= padY;
    max += padY;

    const n = points.length;
    const step = plotW / n;
    const x = (i: number) => PAD.left + step * (i + 0.5);
    const y = (v: number) => PAD.top + ((max - v) / (max - min)) * priceH;
    const maxVol = Math.max(...points.map((p) => p.volume), 1);
    const vy = (v: number) => volTop + volH - (v / maxVol) * volH;

    return { plotW, priceH, volTop, volH, min, max, step, x, y, vy, n };
  }, [width, height, points, mode, previousClose, hasVolume]);

  const last = points[points.length - 1];
  const reference = previousClose ?? points[0]?.close ?? 0;
  const up = last ? last.close >= reference : true;
  const color = up ? "var(--success)" : "var(--danger)";

  const fmtTime = (t: number, long = false) =>
    new Date(t).toLocaleString("pt-BR", {
      timeZone: TZ,
      ...(intraday
        ? long
          ? { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
          : { hour: "2-digit", minute: "2-digit" }
        : long
          ? { day: "2-digit", month: "short", year: "numeric" }
          : { day: "2-digit", month: "2-digit" }),
    });

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round((px - PAD.left) / geo.step - 0.5);
    setHover(Math.max(0, Math.min(geo.n - 1, i)));
  }

  const summary = last
    ? `Último preço ${formatPrice(last.close)}, ${up ? "alta" : "queda"} de ${(((last.close / (reference || last.close)) - 1) * 100).toFixed(2)}% no período.`
    : "Sem dados.";

  return (
    <div ref={wrapRef} className={cn("relative w-full select-none", className)} style={{ height }}>
      {geo && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={summary}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          className="touch-pan-y"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.32} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* grade e preços do eixo */}
          {niceTicks(geo.min, geo.max, 4).map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={PAD.left + geo.plotW}
                y1={geo.y(v)}
                y2={geo.y(v)}
                stroke="var(--chart-grid)"
                strokeDasharray="2 4"
              />
              <text x={PAD.left + geo.plotW + 8} y={geo.y(v) + 4} fontSize={11} fill="var(--chart-axis)" className="tabular-nums">
                {formatPrice(v)}
              </text>
            </g>
          ))}

          {/* datas */}
          {(() => {
            const ticks = Math.min(6, Math.max(2, Math.floor(geo.plotW / 110)));
            return Array.from({ length: ticks }, (_, k) => Math.round((k * (geo.n - 1)) / (ticks - 1))).map((i, k) => (
              <text
                key={`${i}-${k}`}
                x={geo.x(i)}
                y={height - 8}
                fontSize={11}
                fill="var(--chart-axis)"
                textAnchor={k === 0 ? "start" : k === ticks - 1 ? "end" : "middle"}
              >
                {fmtTime(points[i].t)}
              </text>
            ));
          })()}

          {/* volume */}
          {hasVolume &&
            points.map((p, i) => {
              const prev = points[i - 1]?.close ?? p.open;
              const rising = p.close >= (mode === "candle" ? p.open : prev);
              const w = Math.max(1, geo.step * 0.7);
              return (
                <rect
                  key={`v${p.t}`}
                  x={geo.x(i) - w / 2}
                  y={geo.vy(p.volume)}
                  width={w}
                  height={Math.max(0, geo.volTop + geo.volH - geo.vy(p.volume))}
                  fill={rising ? "var(--success)" : "var(--danger)"}
                  opacity={hover === i ? 0.55 : 0.22}
                />
              );
            })}

          {/* fechamento anterior */}
          {previousClose != null && (
            <g>
              <line
                x1={PAD.left}
                x2={PAD.left + geo.plotW}
                y1={geo.y(previousClose)}
                y2={geo.y(previousClose)}
                stroke="var(--chart-axis)"
                strokeDasharray="4 4"
                opacity={0.7}
              />
              <text x={PAD.left + 4} y={geo.y(previousClose) - 5} fontSize={10} fill="var(--chart-axis)">
                Fechamento anterior {formatPrice(previousClose)}
              </text>
            </g>
          )}

          {/* preço */}
          {mode === "line" ? (
            <>
              <path
                d={
                  points.map((p, i) => `${i ? "L" : "M"}${geo.x(i).toFixed(1)},${geo.y(p.close).toFixed(1)}`).join("") +
                  `L${geo.x(geo.n - 1).toFixed(1)},${(PAD.top + geo.priceH).toFixed(1)}L${geo.x(0).toFixed(1)},${(PAD.top + geo.priceH).toFixed(1)}Z`
                }
                fill={`url(#${gradientId})`}
              />
              <path
                d={points.map((p, i) => `${i ? "L" : "M"}${geo.x(i).toFixed(1)},${geo.y(p.close).toFixed(1)}`).join("")}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : (
            points.map((p, i) => {
              const rising = p.close >= p.open;
              const c = rising ? "var(--success)" : "var(--danger)";
              const bodyW = Math.max(1, Math.min(14, geo.step * 0.65));
              const top = geo.y(Math.max(p.open, p.close));
              const bottom = geo.y(Math.min(p.open, p.close));
              return (
                <g key={`c${p.t}`} opacity={hover == null || hover === i ? 1 : 0.85}>
                  <line x1={geo.x(i)} x2={geo.x(i)} y1={geo.y(p.high)} y2={geo.y(p.low)} stroke={c} strokeWidth={1} />
                  <rect
                    x={geo.x(i) - bodyW / 2}
                    y={top}
                    width={bodyW}
                    height={Math.max(1, bottom - top)}
                    fill={c}
                    fillOpacity={rising ? 0.9 : 1}
                    rx={bodyW > 4 ? 1 : 0}
                  />
                </g>
              );
            })
          )}

          {/* último preço: etiqueta no eixo + ponto pulsando quando ao vivo */}
          {last && (
            <g>
              <line
                x1={PAD.left}
                x2={PAD.left + geo.plotW}
                y1={geo.y(last.close)}
                y2={geo.y(last.close)}
                stroke={color}
                strokeOpacity={0.45}
                strokeDasharray="1 3"
              />
              <rect x={PAD.left + geo.plotW + 2} y={geo.y(last.close) - 10} width={PAD.right - 4} height={20} rx={6} fill={color} />
              <text
                x={PAD.left + geo.plotW + 2 + (PAD.right - 4) / 2}
                y={geo.y(last.close) + 4}
                fontSize={11}
                fontWeight={600}
                fill="white"
                textAnchor="middle"
                className="tabular-nums"
              >
                {formatPrice(last.close)}
              </text>
              {live && mode === "line" && (
                <>
                  <circle cx={geo.x(geo.n - 1)} cy={geo.y(last.close)} r={8} fill={color} opacity={0.25} className="animate-ping origin-center [transform-box:fill-box]" />
                  <circle cx={geo.x(geo.n - 1)} cy={geo.y(last.close)} r={3.5} fill={color} stroke="var(--surface-solid)" strokeWidth={1.5} />
                </>
              )}
            </g>
          )}

          {/* mira */}
          {hover != null && (
            <g pointerEvents="none">
              <line
                x1={geo.x(hover)}
                x2={geo.x(hover)}
                y1={PAD.top}
                y2={height - PAD.bottom}
                stroke="var(--chart-axis)"
                strokeDasharray="3 3"
              />
              <line
                x1={PAD.left}
                x2={PAD.left + geo.plotW}
                y1={geo.y(points[hover].close)}
                y2={geo.y(points[hover].close)}
                stroke="var(--chart-axis)"
                strokeDasharray="3 3"
              />
              <circle cx={geo.x(hover)} cy={geo.y(points[hover].close)} r={4} fill={color} stroke="var(--surface-solid)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}

      {geo && hover != null && (
        <Tip
          p={points[hover]}
          prev={hover > 0 ? points[hover - 1].close : (previousClose ?? points[hover].open)}
          left={geo.x(hover)}
          width={width}
          time={fmtTime(points[hover].t, true)}
          formatPrice={formatPrice}
          showOhlc={mode === "candle"}
          showVolume={hasVolume}
        />
      )}

      {!geo && <div className="h-full w-full animate-pulse rounded-xl bg-tint" />}
    </div>
  );
}

function Tip({
  p,
  prev,
  left,
  width,
  time,
  formatPrice,
  showOhlc,
  showVolume,
}: {
  p: Candle;
  prev: number;
  left: number;
  width: number;
  time: string;
  formatPrice: (v: number) => string;
  showOhlc: boolean;
  showVolume: boolean;
}) {
  const chg = prev ? (p.close / prev - 1) * 100 : 0;
  const boxW = 168;
  const x = left + 14 + boxW > width - PAD.right ? left - 14 - boxW : left + 14;
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 rounded-xl border border-line-strong bg-surface-solid/95 px-3 py-2 text-[11px] shadow-lg backdrop-blur"
      style={{ left: x, width: boxW }}
    >
      <p className="text-faint">{time}</p>
      <p className="mt-0.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums text-foreground">{formatPrice(p.close)}</span>
        <span className={cn("tabular-nums", chg >= 0 ? "text-success" : "text-danger")}>
          {chg > 0 ? "+" : ""}
          {chg.toFixed(2).replace(".", ",")}%
        </span>
      </p>
      {showOhlc && (
        <dl className="mt-1 grid grid-cols-2 gap-x-2 tabular-nums text-muted-foreground">
          <dt>Abertura</dt>
          <dd className="text-right text-foreground">{formatPrice(p.open)}</dd>
          <dt>Máxima</dt>
          <dd className="text-right text-foreground">{formatPrice(p.high)}</dd>
          <dt>Mínima</dt>
          <dd className="text-right text-foreground">{formatPrice(p.low)}</dd>
        </dl>
      )}
      {showVolume && p.volume > 0 && (
        <p className="mt-1 flex justify-between text-muted-foreground">
          <span>Volume</span>
          <span className="tabular-nums text-foreground">{fmtVolume(p.volume)}</span>
        </p>
      )}
    </div>
  );
}

/** Minigráfico do dia (tabela e faixa de cotações). */
export function Sparkline({
  values,
  reference,
  width = 88,
  height = 28,
  className,
}: {
  values: number[] | null | undefined;
  reference?: number | null;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!values || values.length < 2) {
    return <span className={cn("inline-block", className)} style={{ width, height }} aria-hidden />;
  }
  const ref = reference ?? values[0];
  const min = Math.min(...values, ref);
  const max = Math.max(...values, ref);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * (width - 2) + 1;
  const y = (v: number) => 2 + ((max - v) / span) * (height - 4);
  const up = values[values.length - 1] >= ref;
  const color = up ? "var(--success)" : "var(--danger)";
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg width={width} height={height} className={className} aria-hidden>
      <line x1={0} x2={width} y1={y(ref)} y2={y(ref)} stroke="var(--chart-axis)" strokeDasharray="2 2" opacity={0.5} />
      <path d={`${d}L${x(values.length - 1)},${height}L${x(0)},${height}Z`} fill={color} opacity={0.1} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
