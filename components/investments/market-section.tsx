"use client";

import { useEffect, useState } from "react";
import { CandlestickChart, LineChart } from "lucide-react";

import type { TapeItem } from "@/app/api/market/overview/route";
import { brl, signedPct, toneClass } from "@/components/investments/format";
import { MarketChart, Sparkline, type ChartMode } from "@/components/investments/market-chart";
import { useHistory } from "@/components/investments/use-history";
import type { HistoryRange } from "@/lib/market/symbols";
import { cn } from "@/lib/utils";

export const RANGES: { key: HistoryRange; label: string }[] = [
  { key: "1d", label: "Hoje" },
  { key: "5d", label: "5D" },
  { key: "1mo", label: "1M" },
  { key: "6mo", label: "6M" },
  { key: "1y", label: "1A" },
  { key: "5y", label: "5A" },
];

const MARKETS = [
  { key: "ibov", label: "Ibovespa", unit: "pts" },
  { key: "dolar", label: "Dólar", unit: "brl" },
  { key: "btc", label: "Bitcoin", unit: "brl" },
  { key: "sp500", label: "S&P 500", unit: "pts" },
] as const;
type MarketKey = (typeof MARKETS)[number]["key"];

const OVERVIEW_MS = 30_000;

export const formatPoints = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: v < 100 ? 2 : 0 });

export function formatTapePrice(item: Pick<TapeItem, "price" | "currency">) {
  if (item.currency === "PTS") return formatPoints(item.price);
  if (item.currency === "USD")
    return item.price.toLocaleString("pt-BR", { style: "currency", currency: "USD" });
  return brl(item.price);
}

/** Cotações do topo (faixa + abas do painel), atualizadas a cada 30 s. */
function useOverview() {
  const [items, setItems] = useState<TapeItem[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/market/overview", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (alive && json?.items) setItems(json.items);
        })
        .catch(() => {});
    void load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, OVERVIEW_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return items;
}

export function TickerTape({ items }: { items: TapeItem[] | null }) {
  if (!items) {
    return <div className="h-11 animate-pulse rounded-2xl bg-tint" />;
  }
  const row = (hidden: boolean) =>
    items.map((it) => (
      <li key={`${hidden ? "b" : "a"}-${it.key}`} aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-2 px-4">
        <span className="text-xs font-semibold text-foreground">{it.label}</span>
        <span className="text-xs tabular-nums text-text-soft">{formatTapePrice(it)}</span>
        <span className={cn("text-xs tabular-nums", toneClass(it.changePct))}>{signedPct(it.changePct)}</span>
        <Sparkline values={it.spark} width={44} height={16} />
      </li>
    ));
  return (
    <div className="forge-tape group relative overflow-hidden rounded-2xl border border-line bg-surface-solid py-2.5" aria-label="Cotações do mercado">
      <ul className="forge-tape-track flex w-max">
        {row(false)}
        {row(true)}
      </ul>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[var(--surface-solid)] to-transparent" />
      <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[var(--surface-solid)] to-transparent" />
    </div>
  );
}

export function ChartControls({
  range,
  onRange,
  mode,
  onMode,
}: {
  range: HistoryRange;
  onRange: (r: HistoryRange) => void;
  mode: ChartMode;
  onMode: (m: ChartMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5 rounded-xl bg-tint p-1" role="tablist" aria-label="Período">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            role="tab"
            aria-selected={range === r.key}
            onClick={() => onRange(r.key)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition",
              range === r.key ? "bg-surface-solid text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex gap-0.5 rounded-xl bg-tint p-1">
        {(
          [
            ["line", LineChart, "Linha"],
            ["candle", CandlestickChart, "Candles"],
          ] as const
        ).map(([m, Icon, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => onMode(m)}
            aria-pressed={mode === m}
            aria-label={label}
            title={label}
            className={cn(
              "rounded-lg px-2 py-1 transition",
              mode === m ? "bg-surface-solid text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function MarketSection() {
  const items = useOverview();
  const [market, setMarket] = useState<MarketKey>("ibov");
  const [range, setRange] = useState<HistoryRange>("1d");
  const [mode, setMode] = useState<ChartMode>("line");
  const { data, loading } = useHistory(`market=${market}`, range);

  const cfg = MARKETS.find((m) => m.key === market)!;
  const quote = items?.find((i) => i.key === market) ?? null;
  const points = data?.points ?? [];
  const last = points[points.length - 1];
  const reference = data?.previousClose ?? points[0]?.close ?? null;
  const price = range === "1d" && quote ? quote.price : (last?.close ?? quote?.price ?? null);
  const change = range === "1d" && quote ? quote.changePct : last && reference ? (last.close / reference - 1) * 100 : null;
  const fmt = cfg.unit === "pts" ? formatPoints : brl;
  const live = range === "1d" && !!quote?.marketOpen;

  return (
    <div className="space-y-3">
      <TickerTape items={items} />

      <section className="forge-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap gap-1">
              {MARKETS.map((m) => {
                const q = items?.find((i) => i.key === m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMarket(m.key)}
                    aria-pressed={market === m.key}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-left transition",
                      market === m.key ? "border-brand/50 bg-brand/10" : "border-line hover:bg-tint"
                    )}
                  >
                    <span className="block text-[11px] text-faint">{m.label}</span>
                    <span className={cn("block text-xs font-semibold tabular-nums", toneClass(q?.changePct))}>
                      {signedPct(q?.changePct)}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-end gap-3">
              <p className="forge-figure text-4xl sm:text-5xl">
                {price != null ? fmt(price) : "—"}
                {cfg.unit === "pts" && price != null && <span className="ml-1 text-base text-faint">pts</span>}
              </p>
              <div className="pb-1">
                <p className={cn("text-sm font-medium tabular-nums", toneClass(change))}>
                  {signedPct(change)} {range === "1d" ? "hoje" : "no período"}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-faint">
                  {live ? (
                    <>
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      Ao vivo · atualiza a cada 30 s{market === "ibov" || market === "sp500" ? " · atraso de até 15 min" : ""}
                    </>
                  ) : range === "1d" ? (
                    "Mercado fechado · último pregão"
                  ) : (
                    "Histórico"
                  )}
                </p>
              </div>
            </div>
          </div>
          <ChartControls range={range} onRange={setRange} mode={mode} onMode={setMode} />
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="h-[300px] animate-pulse rounded-xl bg-tint sm:h-[340px]" />
          ) : !points.length ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-faint">{data?.error ?? "Sem dados agora."}</div>
          ) : (
            <MarketChart
              points={points}
              mode={mode}
              previousClose={range === "1d" ? data?.previousClose : null}
              intraday={range === "1d" || range === "5d"}
              formatPrice={fmt}
              live={live}
              height={320}
            />
          )}
        </div>
      </section>
    </div>
  );
}
