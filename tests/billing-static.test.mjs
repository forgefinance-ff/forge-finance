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

test('pricing and future plan features are clearly separated from the beta', () => {
  assert.match(plans, /availableNow: true/);
  assert.match(plans, /availableNow: false/);
  assert.match(plans, /1990/);
  assert.match(plans, /7990/);
  assert.ok(existsSync('app/(dashboard)/planos/page.tsx'));
  assert.ok(existsSync('app/(dashboard)/assinatura/page.tsx'));
});
