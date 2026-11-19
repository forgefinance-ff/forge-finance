import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateUsageCost } from "../../lib/ai/pricing.ts";
import {
  DEFAULT_USD_BRL,
  averageServicePrice,
  microsToBrl,
  parseUsdBrl,
  userWhatsappCost,
  whatsappMonthCost,
} from "../../lib/admin/usage-cost.ts";

test("custo da IA: Haiku 5.5 soma entrada, saída e cache", () => {
  const cost = calculateUsageCost("claude-haiku-5-5", {
    input_tokens: 1_000,
    output_tokens: 1_000,
    cache_read_input_tokens: 10_000,
    cache_creation_input_tokens: 1_000,
  });
  // 100 + 500 + 100 + 125 milionésimos de dólar
  assert.equal(cost.costUsdMicros, 825);
  assert.equal(cost.priced, true);
});

test("custo da IA: pedido acima de 100 mil tokens no Haiku custa 5 vezes mais", () => {
  const cost = calculateUsageCost("claude-haiku-5-5", { input_tokens: 100_001, output_tokens: 0 });
  assert.equal(cost.costUsdMicros, Math.round(100_001 * 0.1 * 5));
});

test("custo da IA: modelo fora da tabela conta tokens, mas fica sem preço", () => {
  const cost = calculateUsageCost("modelo-desconhecido", { input_tokens: 50, output_tokens: 20 });
  assert.equal(cost.priced, false);
  assert.equal(cost.costUsdMicros, 0);
  assert.equal(cost.inputTokens, 50);
});

test("custo da IA: campos ausentes valem zero", () => {
  assert.equal(calculateUsageCost("claude-haiku-5-5", {}).costUsdMicros, 0);
});

test("cotação: usa a variável e cai no padrão quando inválida", () => {
  assert.equal(parseUsdBrl("5,40"), 5.4);
  assert.equal(parseUsdBrl("abc"), DEFAULT_USD_BRL);
  assert.equal(parseUsdBrl(undefined), DEFAULT_USD_BRL);
  assert.equal(microsToBrl(1_000_000, 5), 5);
});

test("WhatsApp: as 1.000 respostas grátis saem da conta do mês", () => {
  assert.equal(whatsappMonthCost(1000, 0), 0);
  assert.equal(averageServicePrice(1000), 0);
  assert.equal(averageServicePrice(0), 0);
  assert.ok(Math.abs(whatsappMonthCost(1100, 10) - (100 * 0.035 + 10 * 0.04)) < 1e-9);
});

test("WhatsApp: as partes dos usuários somam o custo do mês", () => {
  const price = averageServicePrice(2000);
  const a = userWhatsappCost({ outboundService: 1500, outboundTemplate: 0, deliveryFailed: 0 }, price);
  const b = userWhatsappCost({ outboundService: 500, outboundTemplate: 0, deliveryFailed: 0 }, price);
  assert.ok(Math.abs(a + b - whatsappMonthCost(2000, 0)) < 1e-9);
});

test("WhatsApp: entrega que falhou não entra no custo do usuário", () => {
  assert.equal(userWhatsappCost({ outboundService: 3, outboundTemplate: 0, deliveryFailed: 5 }, 0.035), 0);
});
