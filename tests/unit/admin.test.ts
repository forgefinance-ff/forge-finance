import { test } from "node:test";
import assert from "node:assert/strict";

import { isAdminEmail } from "../../lib/admin/emails.ts";
import { isManualAccessValid } from "../../lib/billing/manual-access.ts";

test("admin: só e-mails da lista, sem diferenciar maiúsculas", () => {
  process.env.ADMIN_EMAILS = " Ana@forge.com , bruno@forge.com ";
  assert.equal(isAdminEmail("ana@forge.com"), true);
  assert.equal(isAdminEmail("BRUNO@forge.com"), true);
  assert.equal(isAdminEmail("intruso@forge.com"), false);
  assert.equal(isAdminEmail(undefined), false);
  process.env.ADMIN_EMAILS = "";
  assert.equal(isAdminEmail("ana@forge.com"), false);
});

test("acesso manual: vale sem prazo ou até a data", () => {
  const now = new Date("2026-11-15T12:00:00Z");
  assert.equal(isManualAccessValid(null, now), true);
  assert.equal(isManualAccessValid("2026-11-20T00:00:00Z", now), true);
  assert.equal(isManualAccessValid("2026-11-10T00:00:00Z", now), false);
});
