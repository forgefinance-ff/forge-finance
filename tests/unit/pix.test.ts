import { test } from "node:test";
import assert from "node:assert/strict";

import { PIX_MANDATE_MAX_BRL, pixEnabled, pixPaymentOptions } from "../../lib/billing/config.ts";
import { PLAN_PRICING } from "../../lib/billing/plans.ts";

test("Pix desligado: o pagamento não leva opções de Pix", () => {
  delete process.env.STRIPE_PIX_ENABLED;
  assert.equal(pixEnabled(), false);
  assert.deepEqual(pixPaymentOptions(), {});
});

test("Pix ligado: autorização mensal do Pix Automático", () => {
  process.env.STRIPE_PIX_ENABLED = "true";
  try {
    assert.deepEqual(pixPaymentOptions(), {
      payment_method_options: { pix: { mandate_options: { payment_schedule: "monthly" } } },
    });
  } finally {
    delete process.env.STRIPE_PIX_ENABLED;
  }
});

test("o limite do Pix cobre o preço mais alto, inclusive o anual", () => {
  const highest = Math.max(
    ...Object.values(PLAN_PRICING).flatMap((plan) => [plan.month.cents, plan.year.cents])
  );
  assert.ok(highest <= PIX_MANDATE_MAX_BRL * 100);
});
