import { test } from "node:test";
import assert from "node:assert/strict";

import {
  guessAssetClass,
  normalizeTicker,
  yahooSymbol,
} from "../../lib/market/symbols.ts";
import { buildPortfolio, quoteKey, type InvestmentRow, type Quote } from "../../lib/market/portfolio.ts";

test("normaliza códigos da B3, cripto e EUA", () => {
  assert.equal(normalizeTicker(" petr4 ", "acao"), "PETR4");
  assert.equal(normalizeTicker("PETR4F", "acao"), "PETR4");
  assert.equal(normalizeTicker("petr4.sa", "acao"), "PETR4");
  assert.equal(normalizeTicker("HGLG11", "fii"), "HGLG11");
  assert.equal(normalizeTicker("PETROBRAS", "acao"), null);
  assert.equal(normalizeTicker("btc-brl", "cripto"), "BTC");
  assert.equal(normalizeTicker("aapl", "exterior"), "AAPL");
  assert.equal(normalizeTicker("BRK.B", "exterior"), "BRK.B");
  assert.equal(normalizeTicker("", "acao"), null);
});

test("símbolo do Yahoo por classe", () => {
  assert.equal(yahooSymbol("PETR4", "acao"), "PETR4.SA");
  assert.equal(yahooSymbol("BTC", "cripto"), "BTC-USD");
  assert.equal(yahooSymbol("BRK.B", "exterior"), "BRK-B");
});

test("palpite de classe", () => {
  assert.equal(guessAssetClass("ITUB4"), "acao");
  assert.equal(guessAssetClass("HGLG11"), "fii");
  assert.equal(guessAssetClass("AAPL34"), "bdr");
  assert.equal(guessAssetClass("BTC"), "cripto");
  assert.equal(guessAssetClass("AAPL"), "exterior");
});

const quote = (price: number, previousClose: number, extra: Partial<Quote> = {}): Quote => ({
  symbol: "X",
  price,
  previousClose,
  change: price - previousClose,
  changePct: (price / previousClose - 1) * 100,
  currency: "BRL",
  name: null,
  time: 0,
  marketOpen: true,
  dayHigh: null,
  dayLow: null,
  source: "yahoo",
  ...extra,
});

const rows: InvestmentRow[] = [
  {
    id: "a",
    name: "PETR4",
    type: "Renda Variável",
    institution: "XP",
    invested_amount: 3000,
    current_value: 0,
    ticker: "PETR4",
    asset_class: "acao",
    quantity: 100,
    avg_price: 30,
  },
  {
    id: "b",
    name: "AAPL",
    type: "Renda Variável",
    institution: "Avenue",
    invested_amount: 1000,
    current_value: 0,
    ticker: "AAPL",
    asset_class: "exterior",
    quantity: 1,
    avg_price: 200,
  },
  {
    id: "c",
    name: "Tesouro Selic",
    type: "Renda Fixa",
    institution: "Nubank",
    invested_amount: 5000,
    current_value: 5500,
  },
];

test("carteira: valor, resultado, variação do dia e câmbio", () => {
  const quotes = new Map<string, Quote>([
    [quoteKey("PETR4", "acao"), quote(40, 38)],
    [quoteKey("AAPL", "exterior"), quote(250, 240, { currency: "USD" })],
  ]);

  const p = buildPortfolio(rows, quotes, {
    usdBrl: 5,
    ibovespa: { price: 130000, changePct: 1 },
    realizedProfit: 120,
  });

  const petr = p.positions.find((x) => x.id === "a")!;
  assert.equal(petr.value, 4000);
  assert.equal(petr.profit, 1000);
  assert.equal(petr.dayChange, 200);

  const aapl = p.positions.find((x) => x.id === "b")!;
  assert.equal(aapl.value, 1250); // 1 x 250 x 5
  assert.equal(aapl.dayChange, 50); // (250-240) x 5

  assert.equal(p.total, 4000 + 1250 + 5500);
  assert.equal(p.invested, 9000);
  assert.equal(p.marketValue, 5250);
  assert.equal(p.manualValue, 5500);
  assert.equal(p.dayChange, 250);
  // 250 / (5250 - 250)
  assert.ok(Math.abs((p.dayChangePct ?? 0) - 5) < 1e-9);
  assert.equal(p.usdExposure, 1250);
  assert.equal(p.realizedProfit, 120);

  // pesos somam 100
  const weights = p.positions.reduce((s, x) => s + x.weight, 0);
  assert.ok(Math.abs(weights - 100) < 1e-9);

  // análise compara com o Ibovespa e aponta concentração
  assert.ok(p.insights.some((i) => i.title === "Acima do Ibovespa hoje"));
  assert.ok(p.insights.some((i) => i.title === "Carteira concentrada"));
});

test("sem cotação usa o último preço salvo e marca como desatualizado", () => {
  const p = buildPortfolio(
    [{ ...rows[0], last_price: 35, last_change_pct: -2, last_price_at: "2026-11-24T20:00:00Z" }],
    new Map(),
    { usdBrl: null }
  );
  const petr = p.positions[0];
  assert.equal(petr.value, 3500);
  assert.equal(petr.stale, true);
  assert.ok(petr.dayChange < 0);
});

test("ativo do exterior sem dólar fica com o valor salvo", () => {
  const p = buildPortfolio([{ ...rows[1], current_value: 1100 }], new Map(), { usdBrl: null });
  assert.equal(p.positions[0].value, 1100);
});
