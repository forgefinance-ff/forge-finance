/**
 * Tickers e classes de ativos (funções puras, sem rede).
 * Usado no servidor e nos testes (importe com caminho relativo).
 */

export const ASSET_CLASSES = ["acao", "fii", "etf", "bdr", "cripto", "exterior"] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  acao: "Ações",
  fii: "Fundos imobiliários",
  etf: "ETFs",
  bdr: "BDRs",
  cripto: "Cripto",
  exterior: "Exterior (EUA)",
};

/** Rótulo curto para listas. */
export const ASSET_CLASS_SHORT: Record<AssetClass, string> = {
  acao: "Ação",
  fii: "FII",
  etf: "ETF",
  bdr: "BDR",
  cripto: "Cripto",
  exterior: "EUA",
};

/** Tipo gravado em investments.type (o resto do app agrupa por ele). */
export const ASSET_CLASS_TYPE: Record<AssetClass, string> = {
  acao: "Renda Variável",
  fii: "Renda Variável",
  etf: "Renda Variável",
  bdr: "Renda Variável",
  cripto: "Cripto",
  exterior: "Renda Variável",
};

export function isAssetClass(value: unknown): value is AssetClass {
  return typeof value === "string" && (ASSET_CLASSES as readonly string[]).includes(value);
}

/** Código da B3: 4 letras + 1 ou 2 números (PETR4, TAEE11, HGLG11, AAPL34). "F" do fracionário sai. */
const B3_TICKER = /^([A-Z]{4})(\d{1,2})F?$/;
const CRYPTO_TICKER = /^[A-Z0-9]{2,10}$/;
const US_TICKER = /^[A-Z]{1,5}([.-][A-Z])?$/;

/** Limpa o que o usuário digitou: maiúsculas, sem espaço, sem ".SA" e sem "F" do fracionário. */
export function normalizeTicker(raw: string, assetClass: AssetClass): string | null {
  let t = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!t) return null;

  if (assetClass === "cripto") {
    t = t.replace(/[-/](BRL|USD|USDT)$/, "");
    return CRYPTO_TICKER.test(t) ? t : null;
  }

  if (assetClass === "exterior") {
    return US_TICKER.test(t) ? t : null;
  }

  t = t.replace(/\.SA$/, "");
  const m = B3_TICKER.exec(t);
  return m ? `${m[1]}${m[2]}` : null;
}

/** Palpite da classe pelo código (o usuário pode trocar). */
export function guessAssetClass(raw: string): AssetClass {
  const t = String(raw ?? "").trim().toUpperCase().replace(/\.SA$/, "").replace(/F$/, "");
  const m = B3_TICKER.exec(t);
  if (m) {
    const n = Number(m[2]);
    if (n >= 32 && n <= 35) return "bdr";
    if (n === 11) return "fii"; // pode ser unit ou ETF: o usuário ajusta
    return "acao";
  }
  if (["BTC", "ETH", "SOL", "USDT", "USDC", "XRP", "ADA", "DOGE", "BNB", "LTC"].includes(t)) return "cripto";
  return "exterior";
}

/**
 * Símbolo no Yahoo Finance. Cripto vem em dólar (o Yahoo não tem mais os
 * pares em real) e é convertida pelo dólar do momento.
 */
export function yahooSymbol(ticker: string, assetClass: AssetClass): string {
  if (assetClass === "cripto") return `${ticker}-USD`;
  if (assetClass === "exterior") return ticker.replace(".", "-");
  return `${ticker}.SA`;
}

/** Moeda em que o ativo é cotado. */
export function assetCurrency(assetClass: AssetClass): "BRL" | "USD" {
  return assetClass === "exterior" ? "USD" : "BRL";
}

/** brapi.dev só cobre a B3 no plano que usamos. */
export function brapiSupports(assetClass: AssetClass): boolean {
  return assetClass !== "cripto" && assetClass !== "exterior";
}

export const INDEX_SYMBOLS = {
  ibovespa: "^BVSP",
  dolar: "BRL=X",
} as const;

export const HISTORY_RANGES = ["1d", "5d", "1mo", "6mo", "1y", "5y"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export function isHistoryRange(value: unknown): value is HistoryRange {
  return typeof value === "string" && (HISTORY_RANGES as readonly string[]).includes(value);
}

/** Intervalo dos pontos do gráfico para cada período. */
export function historyInterval(range: HistoryRange): string {
  switch (range) {
    case "1d":
      return "5m";
    case "5d":
      return "30m";
    case "1mo":
      return "1d";
    case "6mo":
      return "1d";
    case "1y":
      return "1d";
    case "5y":
      return "1wk";
  }
}
