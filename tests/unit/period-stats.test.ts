import { test } from "node:test";
import assert from "node:assert/strict";

import { percentChange, periodRanges, periodStats, type PeriodRow } from "../../lib/period-stats.ts";

const rows: PeriodRow[] = [
  { amount: 100, type: "income", transaction_date: "2026-11-17" },
  { amount: 40, type: "expense", transaction_date: "2026-11-17" },
  { amount: 50, type: "income", transaction_date: "2026-11-16" },
  { amount: 300, type: "income", transaction_date: "2026-11-01" },
  { amount: 200, type: "income", transaction_date: "2026-10-10" },
  { amount: 999, type: "income", transaction_date: "2026-10-20" }, // depois do dia 17: fora do comparativo do mês
  { amount: 80, type: "expense", transaction_date: "2026-01-02T00:00:00" },
];

test("hoje compara com ontem", () => {
  const s = periodStats(rows, "today", "2026-11-17");
  assert.deepEqual(s.current, { income: 100, expense: 40, result: 60, count: 2 });
  assert.deepEqual(s.previous, { income: 50, expense: 0, result: 50, count: 1 });
});

test("esse mês compara com o mês passado até o mesmo dia", () => {
  const s = periodStats(rows, "month", "2026-11-17");
  assert.equal(s.current.income, 450);
  assert.equal(s.previous?.income, 200);
});

test("mês passado menor: compara até o último dia dele", () => {
  assert.deepEqual(periodRanges("month", "2026-03-31").previous, { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(periodRanges("month", "2026-01-15").previous, { from: "2025-12-01", to: "2025-12-15" });
});

test("30 dias e ano", () => {
  assert.deepEqual(periodRanges("30d", "2026-11-17").current, { from: "2026-10-19", to: "2026-11-17" });
  const year = periodStats(rows, "year", "2026-11-17");
  assert.equal(year.previous, null);
  assert.equal(year.current.expense, 120);
});

test("variação por regra de três; sem base dá null", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
  assert.equal(percentChange(-50, -100), 50);
});
