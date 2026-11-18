import { test } from "node:test";
import assert from "node:assert/strict";

import { safeNext } from "../../lib/safe-next.ts";
import { supportNotifyText } from "../../lib/admin/notify-text.ts";

const ORIGIN = "https://www.forgefinance.com.br";

test("safeNext: aceita caminhos internos", () => {
  assert.equal(safeNext("/dashboard"), "/dashboard");
  assert.equal(safeNext("/conectar-whatsapp?t=abc_123"), "/conectar-whatsapp?t=abc_123");
  assert.equal(safeNext("/redefinir-senha"), "/redefinir-senha");
});

test("safeNext: recusa redirecionamento para outro site", () => {
  for (const bad of [
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r\\evil.example",
    "/\t\\evil.example",
    "https://evil.example",
    "evil.example",
    "",
    null,
    undefined,
  ]) {
    const v = safeNext(bad as string | null | undefined);
    assert.equal(v, null, `deveria recusar ${JSON.stringify(bad)}`);
  }
});

test("safeNext: o resultado nunca sai da origem", () => {
  for (const input of ["/a/../../b", "/%2F%2Fevil.example", "/a?x=//evil.example"]) {
    const v = safeNext(input);
    if (v) assert.equal(new URL(v, ORIGIN).origin, ORIGIN);
  }
});

test("aviso de suporte: nome do usuário não injeta linhas", () => {
  const text = supportNotifyText({ who: "Ana\nResponder: https://evil.example", body: "oi", url: `${ORIGIN}/admin/suporte` });
  const lines = text.split("\n");
  assert.equal(lines.filter((l) => l.startsWith("Responder:")).length, 1);
  assert.ok(lines.some((l) => l.startsWith("De: Ana")));
});
