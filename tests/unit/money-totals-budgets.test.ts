// Testes das regras financeiras puras criadas na rodada de qualidade.
// Rodar: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAmount, amountToInput } from "../../lib/money.ts";
import { sumTotals } from "../../lib/totals.ts";
import { budgetMath } from "../../lib/budget-math.ts";

/* ---------------- valores ---------------- */

test("parseAmount: formatos do dia a dia", () => {
  assert.equal(parseAmount("1.500"), 1500);
  assert.equal(parseAmount("1.234.567"), 1234567);
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("R$ 1.500,00"), 1500);
  assert.equal(parseAmount("R$50"), 50);
  assert.equal(parseAmount("1500.50"), 1500.5);
  assert.equal(parseAmount("1,234.56"), 1234.56);
  assert.equal(parseAmount("0,99"), 0.99);
  assert.equal(parseAmount("-10,00"), -10);
  assert.equal(parseAmount("1.5"), 1.5);
});

test("parseAmount: lixo vira NaN (o servidor recusa)", () => {
  assert.ok(Number.isNaN(parseAmount("")));
  assert.ok(Number.isNaN(parseAmount("abc")));
  assert.ok(Number.isNaN(parseAmount("12,34,56")));
  assert.ok(Number.isNaN(parseAmount("1.2.3,4.5")));
});

test("o campo envia '1500.00' e o servidor lê 1500", () => {
  assert.equal(parseAmount((150000 / 100).toFixed(2)), 1500);
  assert.equal(amountToInput(1500), "1500,00");
  assert.equal(parseAmount(amountToInput(1500)), 1500);
});

/* ---------------- totais ---------------- */

test("sumTotals: só 'regular' entra no resultado; fatura e transferência ficam fora", () => {
  const t = sumTotals([
    { type: "income", kind: "regular", total: "5000.00", n: 2 },
    { type: "expense", kind: "regular", total: "1234.56", n: 10 },
    { type: "expense", kind: "card_payment", total: "800", n: 1 },
    { type: "expense", kind: "transfer", total: "300", n: 1 },
    { type: "income", kind: "transfer", total: "300", n: 1 },
    { type: "income", kind: "loan", total: "1000", n: 1 },
    { type: "expense", kind: "contribution", total: "200", n: 1 },
  ]);
  assert.equal(t.income, 5000);
  assert.equal(t.expense, 1234.56);
  assert.equal(t.result, 3765.44);
  assert.equal(t.othersNet, 800);
  assert.equal(t.count, 17);
});

test("sumTotals: centavos sem erro de ponto flutuante", () => {
  const rows = Array.from({ length: 10 }, () => ({ type: "expense" as const, kind: "regular", total: 0.1, n: 1 }));
  assert.equal(sumTotals(rows).expense, 1);
});

/* ---------------- orçamento ---------------- */

test("budgetMath: no ritmo, estoura antes do fim do mês", () => {
  // 704,05 em 14 dias, limite 800 → ~50,29/dia → estoura no dia 16.
  const r = budgetMath(800, 704.05, "2026-11-14");
  assert.equal(r.overrunDay, 16);
  assert.equal(r.status, "attention");
  assert.equal(r.remaining, 95.95);
});

test("budgetMath: dentro do ritmo fica ok", () => {
  const r = budgetMath(900, 100, "2026-11-14");
  assert.equal(r.overrunDay, null);
  assert.equal(r.status, "ok");
  assert.equal(r.projected, Math.round((100 / 14) * 30 * 100) / 100);
});

test("budgetMath: passou do limite", () => {
  const r = budgetMath(300, 320, "2026-11-10");
  assert.equal(r.status, "over");
  assert.equal(r.remaining, -20);
});

test("budgetMath: sem gasto no mês", () => {
  const r = budgetMath(500, 0, "2026-02-01");
  assert.equal(r.status, "ok");
  assert.equal(r.overrunDay, null);
  assert.equal(r.projected, 0);
});
