import { test } from "node:test";
import assert from "node:assert/strict";

import { grantsBusiness, grantsWhatsApp, type AccessRow } from "../../lib/billing/manual-access.ts";
import { PLAN_PRICING, parsePaidPlan, planSlug, yearlyComparison } from "../../lib/billing/plans.ts";
import { personalPlanInput } from "../../lib/whatsapp/agent/plan-guard.ts";

const NOW = new Date("2026-11-18T12:00:00Z");
const PAST = "2026-10-01T00:00:00Z";
const FUTURE = "2026-12-01T00:00:00Z";

function row(overrides: Partial<AccessRow>): AccessRow {
  return {
    plan_id: "free",
    status: "beta",
    access_source: "beta",
    current_period_end: null,
    trial_ends_at: PAST,
    ...overrides,
  };
}

test("preços: Pessoal 19,90 e MEI 29,90, com 2 meses grátis no anual", () => {
  assert.equal(PLAN_PRICING.pessoal.month.cents, 1990);
  assert.equal(PLAN_PRICING.pro.month.cents, 2990);
  assert.equal(yearlyComparison("pessoal").savings, 1990 * 2);
  assert.equal(yearlyComparison("pro").savings, 2990 * 2);
});

test("URL do plano: pessoal é Pessoal; o resto é MEI", () => {
  assert.equal(parsePaidPlan("pessoal"), "pessoal");
  assert.equal(parsePaidPlan("mei"), "pro");
  assert.equal(parsePaidPlan(undefined), "pro");
  assert.equal(planSlug("pro"), "mei");
});

test("Forge Pessoal: tem WhatsApp, mas não tem modo Empresa", () => {
  const pessoal = row({ plan_id: "pessoal", status: "active", access_source: "subscription" });
  assert.equal(grantsWhatsApp(pessoal, NOW), true);
  assert.equal(grantsBusiness(pessoal, NOW), false);
});

test("Forge MEI: tem acesso aos dois", () => {
  const mei = row({ plan_id: "pro", status: "past_due", access_source: "subscription" });
  assert.equal(grantsWhatsApp(mei, NOW), true);
  assert.equal(grantsBusiness(mei, NOW), true);
});

test("Free sem teste não tem nada; no teste grátis tem tudo", () => {
  assert.equal(grantsWhatsApp(row({}), NOW), false);
  assert.equal(grantsBusiness(row({}), NOW), false);
  assert.equal(grantsWhatsApp(row({ trial_ends_at: FUTURE }), NOW), true);
  assert.equal(grantsBusiness(row({ trial_ends_at: FUTURE }), NOW), true);
});

test("acesso liberado pelo admin vale até o prazo", () => {
  const valid = row({ plan_id: "pro", status: "active", access_source: "admin", current_period_end: FUTURE });
  const expired = row({ plan_id: "pro", status: "active", access_source: "admin", current_period_end: PAST });
  assert.equal(grantsBusiness(valid, NOW), true);
  assert.equal(grantsBusiness(expired, NOW), false);
});

test("bot no Forge Pessoal: bloqueia Empresa e prende o resto no Pessoal", () => {
  assert.equal(personalPlanInput("criar_cliente", { nome: "Ana" }), null);
  assert.equal(personalPlanInput("resumo_mei", {}), null);
  assert.equal(personalPlanInput("consultar_saldos", { escopo: "empresa" }), null);
  assert.deepEqual(personalPlanInput("consultar_saldos", {}), { escopo: "pessoal" });
});
