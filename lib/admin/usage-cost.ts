/**
 * Meta no Brasil desde 01/10/2026: respostas do bot ("serviço") têm 1.000 grátis
 * por mês e depois US$ 0,0068 cada (~R$ 0,035); modelos de utilidade custam
 * US$ 0,00782 cada (~R$ 0,040), sempre.
 */
export const WHATSAPP_SERVICE_PRICE = 0.035;
export const WHATSAPP_TEMPLATE_PRICE = 0.04;
export const WHATSAPP_FREE_SERVICE = 1000;

export const DEFAULT_USD_BRL = 5.15;

/** Cotação usada no painel (ADMIN_USD_BRL na Vercel). */
export function parseUsdBrl(value: string | undefined): number {
  const rate = Number(value?.replace(",", "."));
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_BRL;
}

export function microsToBrl(usdMicros: number, usdBrl: number): number {
  return (usdMicros / 1_000_000) * usdBrl;
}

/** Custo do WhatsApp no mês inteiro, já descontando as mensagens grátis. */
export function whatsappMonthCost(serviceSent: number, templateSent: number): number {
  return (
    Math.max(0, serviceSent - WHATSAPP_FREE_SERVICE) * WHATSAPP_SERVICE_PRICE +
    templateSent * WHATSAPP_TEMPLATE_PRICE
  );
}

/** Preço médio por resposta: as mensagens grátis são divididas entre todos. */
export function averageServicePrice(serviceSent: number): number {
  if (serviceSent <= 0) return 0;
  return (Math.max(0, serviceSent - WHATSAPP_FREE_SERVICE) * WHATSAPP_SERVICE_PRICE) / serviceSent;
}

/** Parte de um usuário no custo do WhatsApp. Entrega que falhou não é cobrada. */
export function userWhatsappCost(
  usage: { outboundService: number; outboundTemplate: number; deliveryFailed: number },
  servicePrice: number
): number {
  const delivered = Math.max(0, usage.outboundService - usage.deliveryFailed);
  return delivered * servicePrice + usage.outboundTemplate * WHATSAPP_TEMPLATE_PRICE;
}
