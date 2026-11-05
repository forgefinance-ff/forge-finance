import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20261018090000_billing_foundation.sql', 'utf8');
const aiRoute = readFileSync('app/api/ai/assistant/route.ts', 'utf8');
const quota = readFileSync('lib/billing/usage.ts', 'utf8');
const plans = readFileSync('lib/billing/plans.ts', 'utf8');

test('migration defines the three plans and private entitlement/usage tables', () => {
  assert.match(migration, /create table if not exists public\.plans/i);
  assert.match(migration, /create table if not exists public\.user_entitlements/i);
  assert.match(migration, /create table if not exists public\.usage_records/i);
  assert.match(migration, /'free'/i);
  assert.match(migration, /'plus'/i);
  assert.match(migration, /'business'/i);
});

test('entitlements and usage expose read policies only to their owner', () => {
  assert.match(migration, /auth\.uid\(\) = user_id/);
  assert.match(migration, /revoke all on function public\.consume_my_ai_quota\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.consume_my_ai_quota\(\) to authenticated/i);
  assert.doesNotMatch(migration, /create policy[^;]+on public\.user_entitlements\s+for all/is);
});

test('quota is resolved by the database and consumed through an RPC', () => {
  assert.match(migration, /create or replace function public\.consume_my_ai_quota\(\)/i);
  assert.match(migration, /usage_count < effective_limit/i);
  assert.match(quota, /rpc\("consume_my_ai_quota"\)/);
  assert.match(aiRoute, /consumeAiQuota\(\)/);
  assert.match(aiRoute, /quota\.allowed/);
});

test('Forge Pro pricing (R$19,90 mensal / R$199 anual) and plan pages exist', () => {
  assert.match(plans, /export type PlanId = "free" \| "pro"/);
  assert.match(plans, /month: \{ cents: 1990 \}/);
  assert.match(plans, /year: \{ cents: 19900 \}/);
  assert.ok(existsSync('app/(dashboard)/planos/page.tsx'));
  assert.ok(existsSync('app/(dashboard)/assinatura/page.tsx'));
});

const checkoutMigration = readFileSync('supabase/migrations/20261108090000_stripe_checkout.sql', 'utf8');
const billingConfig = readFileSync('lib/billing/config.ts', 'utf8');
const stripeLib = readFileSync('lib/billing/stripe.ts', 'utf8');
const webhook = readFileSync('app/api/billing/webhook/route.ts', 'utf8');
const proxy = readFileSync('proxy.ts', 'utf8');

test('checkout migration adds Forge Pro, retires Plus/Business and locks new tables', () => {
  assert.match(checkoutMigration, /'pro',\s*'Forge Pro'/);
  assert.match(checkoutMigration, /set is_active = false[\s\S]*where id in \('plus', 'business'\)/);
  for (const table of ['billing_events', 'whatsapp_undo', 'whatsapp_paywall_notices']) {
    assert.match(checkoutMigration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.doesNotMatch(checkoutMigration, /create policy/i);
});

test('billing is off by default and the Stripe webhook is verified', () => {
  assert.match(billingConfig, /process\.env\.BILLING_ENABLED === "true"/);
  assert.match(stripeLib, /createHmac\("sha256"/);
  assert.match(stripeLib, /timingSafeEqual/);
  assert.match(webhook, /verifyStripeSignature\(/);
  assert.match(webhook, /billing_events/);
  assert.match(proxy, /api\/billing\/webhook/);
  assert.doesNotMatch(stripeLib + billingConfig, /NEXT_PUBLIC_STRIPE_SECRET/);
});
