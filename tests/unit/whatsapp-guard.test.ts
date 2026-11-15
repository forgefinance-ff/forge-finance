import { test } from "node:test";
import assert from "node:assert/strict";

import { isIgnoredNumber, linkedDecision, LINK_CODE, MAX_PER_DAY, MAX_PER_HOUR, unlinkedDecision } from "../../lib/whatsapp/guard.ts";

test("anti-loop: número sem conta recebe o link só na 1ª mensagem do dia", () => {
  assert.equal(unlinkedDecision({ isLinkCode: false, lastHour: 1, lastDay: 1 }), "reply");
  assert.equal(unlinkedDecision({ isLinkCode: false, lastHour: 2, lastDay: 2 }), "silent");
  // Um robô mandando 250 mensagens por dia só recebe 1 resposta.
  let replies = 0;
  for (let n = 1; n <= 250; n++) if (unlinkedDecision({ isLinkCode: false, lastHour: n, lastDay: n }) !== "silent") replies++;
  assert.equal(replies, 1);
});

test("anti-loop: VINCULAR funciona, mas com limite por hora", () => {
  assert.ok(LINK_CODE.test("VINCULAR 123456"));
  assert.ok(LINK_CODE.test("  vincular 654321 "));
  assert.ok(!LINK_CODE.test("vincular 12345"));
  assert.equal(unlinkedDecision({ isLinkCode: true, lastHour: 3, lastDay: 9 }), "reply");
  assert.equal(unlinkedDecision({ isLinkCode: true, lastHour: 6, lastDay: 9 }), "silent");
});

test("anti-loop: usuário com conta recebe 1 aviso e depois silêncio", () => {
  assert.equal(linkedDecision(5, 20), "reply");
  assert.equal(linkedDecision(MAX_PER_HOUR, 50), "reply");
  assert.equal(linkedDecision(MAX_PER_HOUR + 1, 50), "warn");
  assert.equal(linkedDecision(MAX_PER_HOUR + 2, 50), "silent");
  assert.equal(linkedDecision(10, MAX_PER_DAY + 1), "warn");
  assert.equal(linkedDecision(10, MAX_PER_DAY + 5), "silent");
});

test("anti-loop: lista de números ignorados", () => {
  assert.equal(isIgnoredNumber("551140041144", "55 11 4004-1144, 5511999999999"), true);
  assert.equal(isIgnoredNumber("5521988887777", "551140041144"), false);
  assert.equal(isIgnoredNumber("551140041144", ""), false);
});
