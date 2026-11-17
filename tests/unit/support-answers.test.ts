import { test } from "node:test";
import assert from "node:assert/strict";

import { findAnswer } from "../../components/support/support-answers.ts";

test("suporte: acha a resposta certa pelas palavras", () => {
  assert.match(findAnswer("como faço pra parcelar no cartão?", "/dashboard")!.text, /Cartão de crédito/);
  assert.match(findAnswer("errei o valor do mercado", "/dashboard")!.text, /edição/);
  assert.match(findAnswer("esqueci minha senha", "/dashboard")!.text, /Esqueci minha senha/);
  assert.match(findAnswer("como conecto o zap", "/dashboard")!.text, /WhatsApp/);
});

test("suporte: sem resposta, devolve null (oferece falar com uma pessoa)", () => {
  assert.equal(findAnswer("qual a previsão do tempo amanhã", "/dashboard"), null);
});

test("suporte: não manda link para a página em que a pessoa já está", () => {
  assert.equal(findAnswer("errei um valor", "/transacoes")!.link, undefined);
});
