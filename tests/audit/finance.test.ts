// Testes da auditoria (isolados): funções financeiras puras do Forge.
// Rodar: node --experimental-strip-types --test tests/audit/
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseAmount } from "../../lib/money.ts";
import { parseMoney, parseDate, parseOfx } from "../../lib/import/statement-parser.ts";
import { invoiceFor, buildInvoices, cardSummary } from "../../lib/card-invoice.ts";

/* ---------------- valores digitados (lib/money.ts) ---------------- */

test("parseAmount: formato brasileiro com centavos", () => {
  assert.equal(parseAmount("1.234,56"), 1234.56);
  assert.equal(parseAmount("89,90"), 89.9);
});

test("parseAmount: ponto decimal", () => {
  assert.equal(parseAmount("1234.56"), 1234.56);
});

test("parseAmount: milhar brasileiro SEM centavos ('1.500' = mil e quinhentos)", () => {
  // Quem digita "1.500" no Brasil quer dizer R$ 1.500,00.
  assert.equal(parseAmount("1.500"), 1500);
});

test("parseAmount: aceita prefixo R$", () => {
  assert.equal(parseAmount("R$ 50,00"), 50);
});

/* ---------------- extratos (lib/import/statement-parser.ts) ---------------- */

test("parseMoney: formatos de banco", () => {
  assert.equal(parseMoney("R$ 1.234,56"), 1234.56);
  assert.equal(parseMoney("-1.234,56"), -1234.56);
  assert.equal(parseMoney("(123,45)"), -123.45);
  assert.equal(parseMoney("123,45 D"), -123.45);
  assert.equal(parseMoney("1,234.56"), 1234.56);
  assert.equal(parseMoney("−50,00"), -50);
  assert.equal(parseMoney(""), null);
  assert.equal(parseMoney("abc"), null);
});

test("parseMoney: milhar sem centavos ('1.500')", () => {
  assert.equal(parseMoney("1.500"), 1500);
});

test("parseDate: formatos e datas inválidas", () => {
  assert.equal(parseDate("12/11/2026"), "2026-11-12");
  assert.equal(parseDate("12/11/26"), "2026-11-12");
  assert.equal(parseDate("2026-11-12T10:00:00"), "2026-11-12");
  assert.equal(parseDate("20261112"), "2026-11-12");
  assert.equal(parseDate("31/02/2026"), null);
  assert.equal(parseDate(""), null);
  assert.equal(parseDate(46338), "2026-11-12"); // série do Excel
});

test("parseOfx: lê lançamento com valor negativo e data", () => {
  const ofx = `<OFX><BANKTRANLIST><STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261110120000[-3:BRT]<TRNAMT>-45.90<FITID>abc1<MEMO>MERCADO</STMTTRN></BANKTRANLIST></OFX>`;
  const rows = parseOfx(ofx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].date, "2026-11-10");
  assert.equal(rows[0].amount, -45.9);
});

/* ---------------- fatura do cartão (lib/card-invoice.ts) ---------------- */

test("invoiceFor: compra antes do fechamento entra na fatura do mês", () => {
  const inv = invoiceFor("2026-11-10", 21, 14);
  assert.equal(inv.closingDate, "2026-11-21");
  assert.equal(inv.dueDate, "2026-12-14");
});

test("invoiceFor: compra NO dia do fechamento vai para a próxima", () => {
  const inv = invoiceFor("2026-11-21", 21, 14);
  assert.equal(inv.closingDate, "2026-12-21");
});

test("invoiceFor: fechamento dia 31 em mês curto (fevereiro)", () => {
  const inv = invoiceFor("2027-02-10", 31, 10);
  assert.ok(/^2027-02-2[89]$/.test(inv.closingDate), `fechamento ${inv.closingDate}`);
});

test("fatura: pagamento não conta como compra e não dobra a dívida", () => {
  const card = { id: "c", name: "Nubank", closing_day: 21, due_day: 14, limit_amount: 5000 };
  const movements = [
    { id: "1", date: "2026-09-05", amount: 300, kind: "purchase" as const, description: "Loja" },
    { id: "2", date: "2026-10-14", amount: 300, kind: "payment" as const, description: "Pagamento" },
  ];
  const invoices = buildInvoices(card, movements, "2026-11-14");
  const summary = cardSummary(card, invoices, "2026-11-14");
  assert.equal(summary.used, 0);
  assert.equal(summary.available, 5000);
});

test("fatura: estorno reduz a fatura", () => {
  const card = { id: "c", name: "Nubank", closing_day: 21, due_day: 14, limit_amount: 5000 };
  const movements = [
    { id: "1", date: "2026-11-05", amount: 200, kind: "purchase" as const, description: "Loja" },
    { id: "2", date: "2026-11-08", amount: 50, kind: "refund" as const, description: "Estorno" },
  ];
  const summary = cardSummary(card, buildInvoices(card, movements, "2026-11-14"), "2026-11-14");
  assert.equal(summary.used, 150);
});

test("fatura: centavos de parcelas somam sem erro de arredondamento", () => {
  const card = { id: "c", name: "Nubank", closing_day: 21, due_day: 14, limit_amount: 5000 };
  const movements = Array.from({ length: 3 }, (_, i) => ({
    id: String(i),
    date: "2026-11-05",
    amount: [33.33, 33.33, 33.34][i],
    kind: "purchase" as const,
    description: "Parcela",
  }));
  const summary = cardSummary(card, buildInvoices(card, movements, "2026-11-14"), "2026-11-14");
  assert.equal(summary.used, 100);
});
