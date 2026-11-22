import { test } from "node:test";
import assert from "node:assert/strict";

import { parseUtmCookie, serializeUtm, utmFromSearch, utmMetadata } from "../../lib/utm.ts";
import { buildPaidOrder, trackingFromMetadata, utmifyDate } from "../../lib/utmify-core.ts";

test("UTMs: lê só os parâmetros conhecidos da URL", () => {
  const params = utmFromSearch("?utm_source=meta&utm_content=V1%20caderno&fbclid=abc&outro=1");
  assert.deepEqual(params, { utm_source: "meta", utm_content: "V1 caderno" });
});

test("UTMs: cookie vai e volta, e lixo vira vazio", () => {
  const raw = serializeUtm({ utm_source: "meta", utm_campaign: "teste" });
  assert.deepEqual(parseUtmCookie(raw), { utm_source: "meta", utm_campaign: "teste" });
  assert.deepEqual(parseUtmCookie("%%%não-json"), {});
  assert.deepEqual(parseUtmCookie(encodeURIComponent(JSON.stringify({ utm_source: 1, hack: "x" }))), {});
});

test("UTMs: metadata do Stripe só com chaves preenchidas", () => {
  assert.deepEqual(utmMetadata({ utm_source: "meta" }), { utm_source: "meta" });
});

test("Utmify: data em UTC no formato da API", () => {
  assert.equal(utmifyDate(Date.UTC(2026, 10, 22, 3, 4, 5) / 1000), "2026-11-22 03:04:05");
  assert.equal(utmifyDate(null), null);
});

test("Utmify: pedido pago com valor, UTMs e modo de teste", () => {
  const order = buildPaidOrder({
    invoice: {
      id: "in_123",
      livemode: false,
      created: Date.UTC(2026, 10, 22) / 1000,
      amount_paid: 2990,
      currency: "brl",
      customer_email: "cliente@exemplo.com",
      customer_name: null,
      status_transitions: { paid_at: Date.UTC(2026, 10, 22, 0, 1) / 1000 },
    },
    tracking: trackingFromMetadata({ utm_source: "meta", utm_content: "V2 contas", user_id: "x" }),
    product: { id: "pro", name: "Forge MEI", planId: "price_1", planName: "mensal" },
    paymentMethod: "credit_card",
  });
  assert.equal(order.status, "paid");
  assert.equal(order.isTest, true);
  assert.equal(order.commission.totalPriceInCents, 2990);
  assert.equal(order.commission.userCommissionInCents, 2990);
  assert.equal(order.commission.currency, "BRL");
  assert.equal(order.trackingParameters.utm_content, "V2 contas");
  assert.equal(order.trackingParameters.utm_term, null);
  assert.equal(order.customer.name, "cliente@exemplo.com");
  assert.equal(order.approvedDate, "2026-11-22 00:01:00");
});
