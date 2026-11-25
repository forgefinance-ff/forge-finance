/**
 * Cálculo da carteira e da análise (funções puras, sem rede).
 * Valores em reais; preços na moeda do ativo.
 */
import {
  ASSET_CLASS_LABEL,
  ASSET_CLASS_SHORT,
  assetCurrency,
  isAssetClass,
  type AssetClass,
} from "./symbols.ts";

export type Quote = {
  symbol: string;
  price: number;
  previousClose: number | null;
  change: number | null;
  changePct: number | null;
  currency: string;
  name: string | null;
  /** Hora da cotação (ms). */
  time: number | null;
  marketOpen: boolean;
  dayHigh: number | null;
  dayLow: number | null;
  source: "yahoo" | "brapi";
  /** Fechamentos do dia (minigráfico). */
  spark?: number[] | null;
};

export type InvestmentRow = {
  id: string;
  name: string;
  type: string | null;
  institution: string | null;
  invested_amount: number | string | null;
  current_value: number | string | null;
  ticker?: string | null;
  asset_class?: string | null;
  quantity?: number | string | null;
  avg_price?: number | string | null;
  currency?: string | null;
  last_price?: number | string | null;
  last_change_pct?: number | string | null;
  last_price_at?: string | null;
};

export type Position = {
  id: string;
  kind: "market" | "manual";
  name: string;
  ticker: string | null;
  assetClass: AssetClass | null;
  classLabel: string;
  institution: string | null;
  quantity: number;
  avgPrice: number;
  currency: "BRL" | "USD";
  /** Preço atual na moeda do ativo (null se nunca houve cotação). */
  price: number | null;
  /** Variação do dia em %. */
  dayChangePct: number | null;
  /** Variação do dia em reais. */
  dayChange: number;
  value: number;
  invested: number;
  profit: number;
  profitPct: number | null;
  /** Peso no total investido (0–100). */
  weight: number;
  quoteTime: number | null;
  /** true quando a cotação veio do banco (provedor fora do ar). */
  stale: boolean;
  marketOpen: boolean;
  /** Preços do dia para o minigráfico (null sem cotação). */
  spark: number[] | null;
  previousClose: number | null;
};

export type Insight = {
  tone: "good" | "bad" | "warn" | "info";
  title: string;
  text: string;
};

export type Slice = { key: string; label: string; value: number; pct: number };

export type PortfolioSummary = {
  total: number;
  invested: number;
  profit: number;
  profitPct: number | null;
  dayChange: number;
  dayChangePct: number | null;
  marketValue: number;
  manualValue: number;
  usdExposure: number;
  realizedProfit: number;
  allocation: Slice[];
  positions: Position[];
  insights: Insight[];
};

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (v: number) => Math.round(v * 100) / 100;

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const pct = (v: number, signed = true) =>
  `${signed && v > 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`;

/** Chave usada para achar a cotação de uma linha. */
export function quoteKey(ticker: string, assetClass: AssetClass): string {
  return `${assetClass}:${ticker}`;
}

export function buildPosition(
  row: InvestmentRow,
  quote: Quote | undefined,
  usdBrl: number | null
): Position {
  const assetClass = isAssetClass(row.asset_class) ? row.asset_class : null;
  const ticker = row.ticker ? String(row.ticker) : null;
  const invested = num(row.invested_amount);

  if (!ticker || !assetClass) {
    const value = num(row.current_value);
    const profit = value - invested;
    return {
      id: row.id,
      kind: "manual",
      name: row.name,
      ticker: null,
      assetClass: null,
      classLabel: row.type || "Outros",
      institution: row.institution,
      quantity: 0,
      avgPrice: 0,
      currency: "BRL",
      price: null,
      dayChangePct: null,
      dayChange: 0,
      value: round2(value),
      invested: round2(invested),
      profit: round2(profit),
      profitPct: invested > 0 ? (profit / invested) * 100 : null,
      weight: 0,
      quoteTime: null,
      stale: false,
      marketOpen: false,
      spark: null,
      previousClose: null,
    };
  }

  const currency = assetCurrency(assetClass);
  const fx = currency === "USD" ? (usdBrl ?? 0) : 1;
  const quantity = num(row.quantity);
  const avgPrice = num(row.avg_price);

  const price = quote ? quote.price : row.last_price != null ? num(row.last_price) : null;
  const dayChangePct = quote
    ? quote.changePct
    : row.last_change_pct != null
      ? num(row.last_change_pct)
      : null;

  // Sem cotação nem dólar: fica com o último valor salvo.
  const value =
    price != null && fx > 0 ? quantity * price * fx : num(row.current_value);

  let dayChange = 0;
  if (quote && quote.previousClose != null && fx > 0) {
    dayChange = quantity * (quote.price - quote.previousClose) * fx;
  } else if (dayChangePct != null && dayChangePct > -100) {
    dayChange = value - value / (1 + dayChangePct / 100);
  }

  const profit = value - invested;

  return {
    id: row.id,
    kind: "market",
    name: quote?.name || row.name,
    ticker,
    assetClass,
    classLabel: ASSET_CLASS_SHORT[assetClass],
    institution: row.institution,
    quantity,
    avgPrice,
    currency,
    price,
    dayChangePct,
    dayChange: round2(dayChange),
    value: round2(value),
    invested: round2(invested),
    profit: round2(profit),
    profitPct: invested > 0 ? (profit / invested) * 100 : null,
    weight: 0,
    quoteTime: quote?.time ?? (row.last_price_at ? Date.parse(row.last_price_at) : null),
    stale: !quote,
    marketOpen: quote?.marketOpen ?? false,
    spark: quote?.spark ?? null,
    previousClose: quote?.previousClose ?? null,
  };
}

export type IndexSnapshot = { changePct: number | null; price: number | null };

export function buildPortfolio(
  rows: InvestmentRow[],
  quotes: Map<string, Quote>,
  opts: { usdBrl: number | null; ibovespa?: IndexSnapshot | null; realizedProfit?: number }
): PortfolioSummary {
  const positions = rows.map((row) => {
    const cls = isAssetClass(row.asset_class) ? row.asset_class : null;
    const quote = row.ticker && cls ? quotes.get(quoteKey(String(row.ticker), cls)) : undefined;
    return buildPosition(row, quote, opts.usdBrl);
  });

  // Posição zerada (vendeu tudo) não pesa no total, mas continua na lista.
  const total = positions.reduce((s, p) => s + p.value, 0);
  const invested = positions.reduce((s, p) => s + p.invested, 0);
  for (const p of positions) p.weight = total > 0 ? (p.value / total) * 100 : 0;

  const market = positions.filter((p) => p.kind === "market");
  const marketValue = market.reduce((s, p) => s + p.value, 0);
  const manualValue = total - marketValue;
  const dayChange = market.reduce((s, p) => s + p.dayChange, 0);
  const openingValue = marketValue - dayChange;
  const dayChangePct = openingValue > 0 && market.length ? (dayChange / openingValue) * 100 : null;
  const usdExposure = market.filter((p) => p.currency === "USD").reduce((s, p) => s + p.value, 0);

  const byClass = new Map<string, { label: string; value: number }>();
  for (const p of positions) {
    if (p.value <= 0) continue;
    const key = p.assetClass ?? `manual:${p.classLabel}`;
    const label = p.assetClass ? ASSET_CLASS_LABEL[p.assetClass] : p.classLabel;
    const cur = byClass.get(key) ?? { label, value: 0 };
    cur.value += p.value;
    byClass.set(key, cur);
  }
  const allocation: Slice[] = [...byClass.entries()]
    .map(([key, s]) => ({ key, label: s.label, value: round2(s.value), pct: total > 0 ? (s.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);

  const profit = total - invested;

  const summary: PortfolioSummary = {
    total: round2(total),
    invested: round2(invested),
    profit: round2(profit),
    profitPct: invested > 0 ? (profit / invested) * 100 : null,
    dayChange: round2(dayChange),
    dayChangePct,
    marketValue: round2(marketValue),
    manualValue: round2(manualValue),
    usdExposure: round2(usdExposure),
    realizedProfit: round2(opts.realizedProfit ?? 0),
    allocation,
    positions: positions.sort((a, b) => b.value - a.value),
    insights: [],
  };

  summary.insights = buildInsights(summary, opts.ibovespa ?? null);
  return summary;
}

/** Leitura da carteira em linguagem simples. Fatos, não recomendação de compra ou venda. */
export function buildInsights(s: PortfolioSummary, ibov: IndexSnapshot | null): Insight[] {
  const out: Insight[] = [];
  const held = s.positions.filter((p) => p.value > 0);
  const market = held.filter((p) => p.kind === "market");

  if (!held.length) return out;

  // 1) Carteira x Ibovespa hoje
  if (market.length && s.dayChangePct != null && ibov?.changePct != null) {
    const diff = s.dayChangePct - ibov.changePct;
    out.push({
      tone: diff >= 0 ? "good" : "bad",
      title: diff >= 0 ? "Acima do Ibovespa hoje" : "Abaixo do Ibovespa hoje",
      text: `Sua parte em bolsa está ${pct(s.dayChangePct)} hoje (${brl(s.dayChange)}). O Ibovespa está ${pct(ibov.changePct)}.`,
    });
  }

  // 2) Maior alta e maior baixa do dia
  const moved = market.filter((p) => p.dayChangePct != null);
  if (moved.length >= 2) {
    const sorted = [...moved].sort((a, b) => (b.dayChangePct ?? 0) - (a.dayChangePct ?? 0));
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    if ((top.dayChangePct ?? 0) > 0) {
      out.push({
        tone: "good",
        title: `${top.ticker} puxa a alta`,
        text: `${top.ticker} sobe ${pct(top.dayChangePct ?? 0)} hoje e soma ${brl(top.dayChange)} na sua carteira.`,
      });
    }
    if ((bottom.dayChangePct ?? 0) < 0) {
      out.push({
        tone: "bad",
        title: `${bottom.ticker} pesa hoje`,
        text: `${bottom.ticker} cai ${pct(bottom.dayChangePct ?? 0)} hoje: ${brl(bottom.dayChange)} na sua carteira.`,
      });
    }
  }

  // 3) Concentração
  const biggest = held[0];
  if (held.length > 1 && biggest.weight >= 25) {
    out.push({
      tone: "warn",
      title: "Carteira concentrada",
      text: `${biggest.ticker ?? biggest.name} é ${biggest.weight.toFixed(0)}% de tudo que você tem investido. Se ele cair 10%, seu total cai ${(biggest.weight / 10).toFixed(1).replace(".", ",")}%.`,
    });
  } else if (held.length === 1 && market.length === 1) {
    out.push({
      tone: "warn",
      title: "Um ativo só",
      text: `Todo o seu investimento cadastrado está em ${biggest.ticker}. Qualquer notícia dessa empresa mexe com 100% da carteira.`,
    });
  }

  // 4) Posições no prejuízo
  const losing = market.filter((p) => p.profit < 0);
  if (losing.length) {
    const sum = losing.reduce((acc, p) => acc + p.profit, 0);
    const worst = [...losing].sort((a, b) => (a.profitPct ?? 0) - (b.profitPct ?? 0))[0];
    out.push({
      tone: "bad",
      title: `${losing.length} ${losing.length === 1 ? "ativo no vermelho" : "ativos no vermelho"}`,
      text: `Somam ${brl(sum)} abaixo do que você pagou. O pior é ${worst.ticker} (${pct(worst.profitPct ?? 0)} desde a compra).`,
    });
  }

  // 5) Melhor resultado desde a compra
  const winners = market.filter((p) => p.profit > 0 && p.profitPct != null);
  if (winners.length) {
    const best = [...winners].sort((a, b) => (b.profitPct ?? 0) - (a.profitPct ?? 0))[0];
    out.push({
      tone: "good",
      title: `Destaque: ${best.ticker}`,
      text: `${pct(best.profitPct ?? 0)} desde a compra, ${brl(best.profit)} de lucro (ainda não realizado).`,
    });
  }

  // 6) Renda variável x fixa
  if (s.total > 0 && market.length) {
    const variablePct = (s.marketValue / s.total) * 100;
    out.push({
      tone: "info",
      title: "Renda variável x fixa",
      text: `${variablePct.toFixed(0)}% do que você tem está em bolsa/cripto e ${(100 - variablePct).toFixed(0)}% em renda fixa e outros.`,
    });
  }

  // 7) Dólar
  if (s.usdExposure > 0 && s.total > 0) {
    out.push({
      tone: "info",
      title: "Exposição ao dólar",
      text: `${((s.usdExposure / s.total) * 100).toFixed(0)}% da carteira (${brl(s.usdExposure)}) está em ativos cotados em dólar: o câmbio também mexe nesse valor.`,
    });
  }

  // 8) Realizado
  if (s.realizedProfit !== 0) {
    out.push({
      tone: s.realizedProfit > 0 ? "good" : "bad",
      title: s.realizedProfit > 0 ? "Lucro já realizado" : "Prejuízo já realizado",
      text: `Nas vendas registradas: ${brl(s.realizedProfit)}.`,
    });
  }

  return out;
}

/** Mercado aberto em algum ativo? Define a frequência de atualização na tela. */
export function anyMarketOpen(positions: Position[]): boolean {
  return positions.some((p) => p.kind === "market" && p.marketOpen);
}
