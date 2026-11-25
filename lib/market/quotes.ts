/**
 * Cotações e histórico de preços.
 *
 * Provedores:
 * 1. Yahoo Finance (sem chave): B3, cripto em reais, EUA, Ibovespa e dólar.
 *    Na B3 o dado vem com atraso de até 15 minutos (regra da própria bolsa
 *    para dado gratuito); cripto e dólar praticamente em tempo real.
 * 2. brapi.dev (com BRAPI_TOKEN): reserva para ações/FIIs da B3 se o Yahoo falhar.
 *
 * Cache em memória por símbolo (vale por instância do servidor) e uma
 * requisição por símbolo em voo, para muitos usuários com a mesma ação não
 * multiplicarem as chamadas.
 */
import type { Quote } from "@/lib/market/portfolio";
import {
  brapiSupports,
  historyInterval,
  INDEX_SYMBOLS,
  yahooSymbol,
  type AssetClass,
  type HistoryRange,
} from "@/lib/market/symbols";

const QUOTE_TTL_MS = 20_000;
const FETCH_TIMEOUT_MS = 6_000;

const YAHOO_HOSTS = ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

type CacheEntry<T> = { at: number; value: T };
const quoteCache = new Map<string, CacheEntry<Quote | null>>();
const inflight = new Map<string, Promise<unknown>>();

export type HistoryPoint = {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type History = {
  points: HistoryPoint[];
  /** Fechamento do pregão anterior (linha tracejada no gráfico de hoje). */
  previousClose: number | null;
  currency: string;
};

export type AssetRef = { ticker: string; assetClass: AssetClass };

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", ...headers },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Reduz a série para no máximo `max` pontos (mantém o último). */
function downsample(values: number[], max: number): number[] {
  if (values.length <= max) return values;
  const step = values.length / max;
  const out: number[] = [];
  for (let i = 0; i < max - 1; i++) out.push(values[Math.floor(i * step)]);
  out.push(values[values.length - 1]);
  return out;
}

const finite = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/* ---------------- Yahoo ---------------- */

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown> & {
        currentTradingPeriod?: { regular?: { start?: number; end?: number } };
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }> | null;
    error?: unknown;
  };
};

async function yahooChart(symbol: string, range: string, interval: string): Promise<YahooChart> {
  const path = `/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
  let lastError: unknown;
  for (const host of YAHOO_HOSTS) {
    try {
      return (await fetchJson(host + path)) as YahooChart;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function yahooQuote(symbol: string): Promise<Quote | null> {
  const data = await yahooChart(symbol, "1d", "5m");
  const result = data.chart?.result?.[0];
  const meta = result?.meta;
  if (!meta) return null;

  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const lastClose = [...closes].reverse().find((c) => typeof c === "number") ?? null;
  const price = finite(meta.regularMarketPrice) ?? finite(lastClose);
  if (price == null || price <= 0) return null;

  const previousClose = finite(meta.chartPreviousClose) ?? finite(meta.previousClose);
  const change = previousClose != null ? price - previousClose : null;
  const changePct = previousClose ? (price / previousClose - 1) * 100 : null;

  const period = meta.currentTradingPeriod?.regular;
  const nowSec = Date.now() / 1000;
  const marketOpen =
    symbol.endsWith("-BRL") ||
    symbol.endsWith("=X") ||
    (!!period?.start && !!period?.end && nowSec >= period.start && nowSec <= period.end);

  const time = finite(meta.regularMarketTime);
  const spark = downsample(
    closes.filter((c): c is number => typeof c === "number" && Number.isFinite(c)),
    48
  );

  return {
    symbol,
    price,
    previousClose,
    change,
    changePct,
    currency: typeof meta.currency === "string" ? meta.currency : "BRL",
    name:
      (typeof meta.longName === "string" && meta.longName) ||
      (typeof meta.shortName === "string" && meta.shortName) ||
      null,
    time: time != null ? time * 1000 : null,
    marketOpen,
    dayHigh: finite(meta.regularMarketDayHigh),
    dayLow: finite(meta.regularMarketDayLow),
    source: "yahoo",
    spark: spark.length >= 2 ? spark : null,
  };
}

/* ---------------- brapi ---------------- */

type BrapiQuote = {
  symbol?: string;
  shortName?: string;
  longName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketPreviousClose?: number;
  regularMarketTime?: string;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  historicalDataPrice?: Array<{ date?: number; close?: number | null }>;
};

function brapiToken(): string | null {
  const t = process.env.BRAPI_TOKEN?.trim();
  return t ? t : null;
}

async function brapiFetch(ticker: string, extra = ""): Promise<BrapiQuote | null> {
  const token = brapiToken();
  if (!token) return null;
  const data = (await fetchJson(
    `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?${extra}`,
    { Authorization: `Bearer ${token}` }
  )) as { results?: BrapiQuote[] };
  return data.results?.[0] ?? null;
}

async function brapiQuote(ticker: string): Promise<Quote | null> {
  const r = await brapiFetch(ticker);
  const price = finite(r?.regularMarketPrice);
  if (!r || price == null || price <= 0) return null;
  const previousClose = finite(r.regularMarketPreviousClose);
  const time = r.regularMarketTime ? Date.parse(r.regularMarketTime) : NaN;
  return {
    symbol: ticker,
    price,
    previousClose,
    change: finite(r.regularMarketChange),
    changePct: finite(r.regularMarketChangePercent),
    currency: r.currency || "BRL",
    name: r.longName || r.shortName || null,
    time: Number.isFinite(time) ? time : null,
    marketOpen: isB3OpenNow(),
    dayHigh: finite(r.regularMarketDayHigh),
    dayLow: finite(r.regularMarketDayLow),
    source: "brapi",
    spark: null,
  };
}

/** Pregão regular da B3 (aproximado, só para o brapi, que não informa). */
function isB3OpenNow(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday");
  if (day === "Sat" || day === "Sun") return false;
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  return minutes >= 10 * 60 && minutes <= 17 * 60 + 55;
}

/* ---------------- API pública do módulo ---------------- */

async function cachedQuote(key: string, load: () => Promise<Quote | null>): Promise<Quote | null> {
  const hit = quoteCache.get(key);
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit.value;

  return dedupe(`q:${key}`, async () => {
    let value: Quote | null = null;
    try {
      value = await load();
    } catch (error) {
      console.error("quote provider failed", key, error instanceof Error ? error.message : error);
    }
    // Falha não fica em cache por muito tempo: guarda o último valor bom se houver.
    if (value) quoteCache.set(key, { at: Date.now(), value });
    else if (hit?.value) return hit.value;
    return value;
  });
}

/** Cotação de um ativo da carteira. */
export function getAssetQuote(ref: AssetRef): Promise<Quote | null> {
  const symbol = yahooSymbol(ref.ticker, ref.assetClass);
  return cachedQuote(symbol, async () => {
    try {
      const q = await yahooQuote(symbol);
      if (q) return q;
    } catch (error) {
      if (!brapiSupports(ref.assetClass) || !brapiToken()) throw error;
    }
    if (brapiSupports(ref.assetClass)) return brapiQuote(ref.ticker);
    return null;
  });
}

/** Várias cotações em paralelo; chave = `${classe}:${ticker}`. */
export async function getAssetQuotes(refs: AssetRef[]): Promise<Map<string, Quote>> {
  const unique = new Map<string, AssetRef>();
  for (const r of refs) unique.set(`${r.assetClass}:${r.ticker}`, r);

  const entries = await Promise.all(
    [...unique.entries()].map(async ([key, ref]) => [key, await getAssetQuote(ref)] as const)
  );

  const out = new Map<string, Quote>();
  for (const [key, q] of entries) if (q) out.set(key, q);
  return out;
}

export type MarketIndices = {
  ibovespa: Quote | null;
  dolar: Quote | null;
};

export async function getIndices(): Promise<MarketIndices> {
  const [ibovespa, dolar] = await Promise.all([
    cachedQuote(INDEX_SYMBOLS.ibovespa, () => yahooQuote(INDEX_SYMBOLS.ibovespa)),
    cachedQuote(INDEX_SYMBOLS.dolar, () => yahooQuote(INDEX_SYMBOLS.dolar)),
  ]);
  return { ibovespa, dolar };
}

const HISTORY_TTL: Record<HistoryRange, number> = {
  "1d": 30_000,
  "5d": 5 * 60_000,
  "1mo": 30 * 60_000,
  "6mo": 60 * 60_000,
  "1y": 60 * 60_000,
  "5y": 6 * 60 * 60_000,
};

const historyCache = new Map<string, CacheEntry<History | null>>();

async function yahooHistory(symbol: string, range: HistoryRange): Promise<History | null> {
  const data = await yahooChart(symbol, range, historyInterval(range));
  const result = data.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0] ?? {};
  const points: HistoryPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    if (typeof close !== "number" || !Number.isFinite(close)) continue;
    const open = finite(q.open?.[i]) ?? close;
    points.push({
      t: ts[i] * 1000,
      open,
      high: Math.max(finite(q.high?.[i]) ?? close, open, close),
      low: Math.min(finite(q.low?.[i]) ?? close, open, close),
      close,
      volume: finite(q.volume?.[i]) ?? 0,
    });
  }
  if (!points.length) return null;
  const meta = result?.meta;
  return {
    points,
    previousClose: range === "1d" ? (finite(meta?.chartPreviousClose) ?? finite(meta?.previousClose)) : null,
    currency: typeof meta?.currency === "string" ? meta.currency : "BRL",
  };
}

async function brapiHistory(ticker: string, range: HistoryRange): Promise<History | null> {
  const r = await brapiFetch(ticker, `range=${range}&interval=${historyInterval(range)}`);
  const points = ((r?.historicalDataPrice ?? []) as Array<Record<string, number | null | undefined>>)
    .filter((p) => typeof p.close === "number" && typeof p.date === "number")
    .map((p) => {
      const close = p.close as number;
      const open = typeof p.open === "number" ? p.open : close;
      return {
        t: (p.date as number) * 1000,
        open,
        high: Math.max(typeof p.high === "number" ? p.high : close, open, close),
        low: Math.min(typeof p.low === "number" ? p.low : close, open, close),
        close,
        volume: typeof p.volume === "number" ? p.volume : 0,
      };
    })
    .sort((a, b) => a.t - b.t);
  return points.length
    ? { points, previousClose: finite(r?.regularMarketPreviousClose), currency: r?.currency || "BRL" }
    : null;
}

async function cachedHistory(
  symbol: string,
  range: HistoryRange,
  load: () => Promise<History | null>
): Promise<History | null> {
  const key = `${symbol}|${range}`;
  const hit = historyCache.get(key);
  if (hit && Date.now() - hit.at < HISTORY_TTL[range]) return hit.value;

  return dedupe(`h:${key}`, async () => {
    let value: History | null = null;
    try {
      value = await load();
    } catch (error) {
      console.error("history provider failed", key, error instanceof Error ? error.message : error);
    }
    if (value) historyCache.set(key, { at: Date.now(), value });
    return value ?? hit?.value ?? null;
  });
}

/** Candles e volume de um ativo da carteira. */
export function getAssetHistory(ref: AssetRef, range: HistoryRange): Promise<History | null> {
  const symbol = yahooSymbol(ref.ticker, ref.assetClass);
  return cachedHistory(symbol, range, async () => {
    try {
      const h = await yahooHistory(symbol, range);
      if (h) return h;
    } catch (error) {
      if (!brapiSupports(ref.assetClass) || !brapiToken()) throw error;
    }
    return brapiSupports(ref.assetClass) && brapiToken() ? brapiHistory(ref.ticker, range) : null;
  });
}

/** Índices e moedas do painel "Bolsa agora". */
export const MARKET_SYMBOLS = {
  ibov: { symbol: "^BVSP", label: "Ibovespa", currency: "PTS" },
  dolar: { symbol: "BRL=X", label: "Dólar", currency: "BRL" },
  btc: { symbol: "BTC-BRL", label: "Bitcoin", currency: "BRL" },
  sp500: { symbol: "^GSPC", label: "S&P 500", currency: "PTS" },
} as const;
export type MarketSymbolKey = keyof typeof MARKET_SYMBOLS;

export function isMarketSymbolKey(v: unknown): v is MarketSymbolKey {
  return typeof v === "string" && v in MARKET_SYMBOLS;
}

export function getMarketHistory(key: MarketSymbolKey, range: HistoryRange): Promise<History | null> {
  const { symbol } = MARKET_SYMBOLS[key];
  return cachedHistory(symbol, range, () => yahooHistory(symbol, range));
}

export function getMarketQuote(key: MarketSymbolKey): Promise<Quote | null> {
  const { symbol } = MARKET_SYMBOLS[key];
  return cachedQuote(symbol, () => yahooQuote(symbol));
}
