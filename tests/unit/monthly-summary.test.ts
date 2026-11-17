import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildHistory,
  buildMonthlySummary,
  defaultSummaryMonth,
  freshSummaryMonth,
  isLastDayOfMonth,
  lastDayOfMonth,
} from "../../lib/monthly-summary-core.ts";
import { isTrialActive, trialDaysLeft } from "../../lib/billing/manual-access.ts";

test("último dia do mês: 28, 29, 30 ou 31", () => {
  assert.equal(lastDayOfMonth("2026-02"), 28);
  assert.equal(lastDayOfMonth("2028-02"), 29);
  assert.equal(lastDayOfMonth("2026-11"), 30);
  assert.equal(lastDayOfMonth("2026-12"), 31);
  assert.equal(isLastDayOfMonth("2026-02-28"), true);
  assert.equal(isLastDayOfMonth("2028-02-28"), false);
  assert.equal(isLastDayOfMonth("2028-02-29"), true);
  assert.equal(isLastDayOfMonth("2026-11-30"), true);
  assert.equal(isLastDayOfMonth("2026-12-30"), false);
});

test("quando o resumo aparece como novo", () => {
  assert.equal(freshSummaryMonth("2026-11-30"), "2026-11");
  assert.equal(freshSummaryMonth("2026-12-01"), "2026-11");
  assert.equal(freshSummaryMonth("2027-01-03"), "2026-12");
  assert.equal(freshSummaryMonth("2026-11-15"), null);
  assert.equal(defaultSummaryMonth("2026-11-15"), "2026-10");
  assert.equal(defaultSummaryMonth("2026-11-30"), "2026-11");
});

const tx = (o: Partial<Record<string, unknown>>) => ({
  type: "expense",
  amount: 0,
  scope: "personal",
  title: "x",
  transaction_date: "2026-11-10",
  created_at: "2026-11-10T15:00:00Z",
  category_id: null,
  categories: null,
  ...o,
});

test("resumo: sobrou, categorias, empresa à parte, hábito e orçamentos", () => {
  const s = buildMonthlySummary(
    "2026-11",
    [
      tx({ type: "income", amount: "3000", created_at: "2026-11-05T12:00:00Z" }),
      tx({ amount: 800, title: "Aluguel", category_id: "c1", categories: { name: "Moradia" } }),
      tx({ amount: 300, title: "Mercado", category_id: "c2", categories: { name: "Alimentação" }, created_at: "2026-11-11T12:00:00Z" }),
      tx({ amount: 200, title: "iFood", category_id: "c2", categories: [{ name: "Alimentação" }], created_at: "2026-11-11T13:00:00Z" }),
      tx({ type: "income", amount: 1500, scope: "business" }),
      tx({ amount: 400, scope: "business" }),
    ] as never,
    1000,
    [
      { category_id: "c2", monthly_limit: 600 },
      { category_id: "c1", monthly_limit: 700 },
    ]
  );
  assert.equal(s.income, 3000);
  assert.equal(s.expense, 1300);
  assert.equal(s.saved, 1700);
  assert.equal(s.savedRate, 57);
  assert.equal(s.expenseChange, 30);
  assert.deepEqual(s.topCategories.map((c) => c.name), ["Moradia", "Alimentação"]);
  assert.equal(s.biggest?.title, "Aluguel");
  assert.equal(s.activeDays, 1);
  assert.deepEqual(s.budgets, { total: 2, kept: 1 });
  assert.deepEqual(s.business, { revenue: 1500, costs: 400, profit: 1100 });
});

test("teste grátis de 30 dias", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  assert.equal(isTrialActive("2026-11-20T00:00:00Z", now), true);
  assert.equal(isTrialActive("2026-11-14T00:00:00Z", now), false);
  assert.equal(isTrialActive(null, now), false);
  assert.equal(trialDaysLeft("2026-11-20T12:00:00Z", now), 5);
  assert.equal(trialDaysLeft("2026-11-10T00:00:00Z", now), 0);
});

test("histórico de 6 meses", () => {
  const h = buildHistory(
    [
      { type: "income", amount: 100, transaction_date: "2026-11-02" },
      { type: "expense", amount: "40", transaction_date: "2026-09-10" },
      { type: "expense", amount: 5, transaction_date: "2026-04-10" },
    ],
    "2026-11"
  );
  assert.deepEqual(h.map((p) => p.month), ["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  assert.equal(h[5].income, 100);
  assert.equal(h[3].expense, 40);
  assert.equal(h[0].label, "jun");
});
