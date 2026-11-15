/**
 * Trava contra conversas de robô com robô (ex.: o assistente do Itaú, que
 * conversou com o bot por 2 semanas e gerou ~3 mil respostas cobradas pela Meta).
 *
 * Regra geral: o bot nunca responde em loop. Quem não tem conta recebe o link
 * de cadastro no máximo uma vez a cada 24 h; quem passa do limite recebe UM
 * aviso e depois o bot fica em silêncio. Funções puras, para dar para testar.
 */

/** Mensagens por hora antes de o bot parar de responder (usuário com conta). */
export const MAX_PER_HOUR = 30;
/** Mensagens por dia antes de o bot parar de responder (usuário com conta). */
export const MAX_PER_DAY = 200;
/** Tentativas de "VINCULAR 123456" por hora para quem ainda não tem conta. */
export const MAX_LINK_TRIES_PER_HOUR = 5;

/** Números que o bot ignora sempre (WHATSAPP_IGNORE_NUMBERS, só dígitos, separados por vírgula). */
export function ignoredNumbers(raw = process.env.WHATSAPP_IGNORE_NUMBERS): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((p) => p.replace(/\D/g, ""))
      .filter((p) => p.length >= 8)
  );
}

export function isIgnoredNumber(phone: string, raw?: string): boolean {
  return ignoredNumbers(raw).has(phone.replace(/\D/g, ""));
}

export type Decision = "reply" | "warn" | "silent";

/**
 * Usuário com conta. As contagens já incluem a mensagem atual.
 * Ao passar do limite, avisa uma vez só (na 1ª mensagem acima dele) e depois silencia.
 */
export function linkedDecision(lastHour: number, lastDay: number): Decision {
  if (lastDay > MAX_PER_DAY) return lastDay === MAX_PER_DAY + 1 ? "warn" : "silent";
  if (lastHour > MAX_PER_HOUR) return lastHour === MAX_PER_HOUR + 1 ? "warn" : "silent";
  return "reply";
}

/**
 * Número sem conta. As contagens já incluem a mensagem atual.
 * - "VINCULAR 123456": responde até MAX_LINK_TRIES_PER_HOUR vezes por hora.
 * - Qualquer outra coisa: só a 1ª mensagem em 24 h recebe o link de cadastro.
 */
export function unlinkedDecision(opts: { isLinkCode: boolean; lastHour: number; lastDay: number }): Decision {
  if (opts.isLinkCode) return opts.lastHour <= MAX_LINK_TRIES_PER_HOUR ? "reply" : "silent";
  return opts.lastDay <= 1 ? "reply" : "silent";
}

export const LINK_CODE = /^\s*vincular\s+(\d{6})\s*$/i;
