import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildInsights,
  buildMonthlySeries,
  monthStartBack,
  percentChange,
  periodTitle,
  previousRange,
  savingsRate,
  topWithOthers,
  weekdaySpend,
} from "../../lib/full-report-core.ts";

test("relatório: período anterior tem o mesmo tamanho", () => {
  assert.deepEqual(previousRange("2026-11-01", "2026-11-30"), {
    from: "2026-10-02",
    to: "2026-10-31",
  });
  assert.deepEqual(previousRange("2026-11-24", "2026-11-24"), {
    from: "2026-11-23",
    to: "2026-11-23",
  });
});

test("relatório: variação e taxa de sobra", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
  assert.equal(savingsRate(1000, 750), 25);
  assert.equal(savingsRate(0, 100), null);
  assert.equal(savingsRate(1000, 1200), -20);
});

test("relatório: série mensal soma, ordena e limita", () => {
  const series = buildMonthlySeries(
    [
      { day: "2026-11-01", income: 3000, expense: 1000 },
      { day: "2026-10-01", income: 2000, expense: 2500 },
      { day: "2026-10-01", income: 500, expense: 0 },
    ],
    12
  );
  assert.equal(series.length, 2);
  assert.equal(series[0].label, "out/26");
  assert.equal(series[0].income, 2500);
  assert.equal(series[0].result, 0);
  assert.equal(series[1].label, "nov/26");
  assert.equal(series[1].result, 2000);
  assert.equal(buildMonthlySeries(series.map((s) => ({ day: `${s.key}-01`, income: s.income, expense: s.expense })), 1).length, 1);
});

test("relatório: categorias viram top + Outras e somam 100%", () => {
  const slices = topWithOthers(
    [
      { name: "A", value: 50 },
      { name: "B", value: 30 },
      { name: "C", value: 10 },
      { name: "D", value: 6 },
      { name: "E", value: 4 },
      { name: "Zero", value: 0 },
    ],
    3
  );
  assert.deepEqual(
    slices.map((s) => s.name),
    ["A", "B", "C", "Outras"]
  );
  assert.equal(slices[3].value, 10);
  assert.equal(Math.round(slices.reduce((s, x) => s + x.share, 0)), 100);
  assert.deepEqual(topWithOthers([], 3), []);
});

test("relatório: gasto por dia da semana (segunda = 0)", () => {
  // 2026-11-23 é segunda; 2026-11-29 é domingo.
  const stats = weekdaySpend([
    { day: "2026-11-23", expense: 100 },
    { day: "2026-11-30", expense: 100 },
    { day: "2026-11-29", expense: 200 },
  ]);
  assert.equal(stats[0].label, "Segunda");
  assert.equal(stats[0].total, 200);
  assert.equal(stats[6].label, "Domingo");
  assert.equal(stats[6].total, 200);
  assert.equal(stats[0].share, 50);
});

test("relatório: títulos e meses", () => {
  assert.equal(periodTitle("2026-11-01", "2026-11-24"), "01/11/2026 a 24/11/2026");
  assert.equal(periodTitle(null, "2026-11-24"), "Todo o período (até 24/11/2026)");
  assert.equal(monthStartBack("2026-11-24", 11), "2025-12-01");
});

test("relatório: destaques só dizem o que os números mostram", () => {
  assert.deepEqual(
    buildInsights({ income: 0, expense: 0, result: 0, previous: null, topExpense: null, topWeekday: null }),
    ["Não há lançamentos neste período."]
  );

  const insights = buildInsights({
    income: 1000,
    expense: 600,
    result: 400,
    previous: { income: 1000, expense: 400 },
    topExpense: { name: "Alimentação", share: 40 },
    topWeekday: { label: "Segunda", share: 30 },
  });
  assert.ok(insights.some((s) => s.includes("Alimentação")));
  assert.ok(insights.some((s) => s.includes("Segunda")));
  assert.ok(insights.some((s) => s.includes("subiram 50%")));
});
