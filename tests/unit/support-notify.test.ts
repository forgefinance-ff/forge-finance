import { test } from "node:test";
import assert from "node:assert/strict";

import { oneLine, parsePhones, supportNotifyText } from "../../lib/admin/notify-text.ts";

test("aviso de suporte: limpa e deduplica os números", () => {
  assert.deepEqual(parsePhones("5521999999999, +55 (21) 99999-9999 , 123, 5511988887777"), [
    "5521999999999",
    "5511988887777",
  ]);
  assert.deepEqual(parsePhones(undefined), []);
});

test("aviso de suporte: texto em uma linha e cortado", () => {
  assert.equal(oneLine("oi\n\n tudo   bem?", 50), "oi tudo bem?");
  assert.equal(oneLine("a".repeat(20), 10), `${"a".repeat(9)}…`);
});

test("aviso de suporte: mensagem tem quem, o quê e o link", () => {
  const text = supportNotifyText({ who: "Ana · ana@x.com", body: "não consigo\nlogar", url: "https://app/admin/suporte" });
  assert.match(text, /Ana · ana@x\.com/);
  assert.match(text, /"não consigo logar"/);
  assert.match(text, /https:\/\/app\/admin\/suporte/);
});
