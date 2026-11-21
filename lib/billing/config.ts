import type { BillingInterval, PaidPlanId } from "./plans";

/**
 * Cobrança desligada por padrão. Só liga com BILLING_ENABLED=true na Vercel.
 * Desligada: ninguém consegue assinar e o WhatsApp continua liberado para todos.
 */
export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

/**
 * Pix Automático nas assinaturas. Ligue com STRIPE_PIX_ENABLED=true só depois
 * de ativar o Pix no Stripe; desligado, o pagamento segue só com cartão.
 */
export function pixEnabled(): boolean {
  return process.env.STRIPE_PIX_ENABLED === "true";
}

/** Valor máximo que o cliente autoriza por mês no Pix Automático (padrão do Stripe). */
export const PIX_MANDATE_MAX_BRL = 400;

/**
 * Opções do Pix Automático para o Checkout. A autorização é mensal e cobre
 * também o plano anual (uma cobrança por ano cabe num limite mensal).
 * O valor máximo fica no padrão do Stripe (R$ 400), acima de todos os preços.
 */
export function pixPaymentOptions(): Record<string, unknown> {
  if (!pixEnabled()) return {};
  return {
    payment_method_options: {
      pix: { mandate_options: { payment_schedule: "monthly" } },
    },
  };
}

function clean(value: string | undefined): string | null {
  return value?.trim() || null;
}

export function stripePriceId(plan: PaidPlanId, interval: BillingInterval): string | null {
  if (plan === "pessoal") {
    return clean(interval === "year" ? process.env.STRIPE_PRICE_PESSOAL_YEARLY : process.env.STRIPE_PRICE_PESSOAL_MONTHLY);
  }
  return clean(interval === "year" ? process.env.STRIPE_PRICE_MEI_YEARLY : process.env.STRIPE_PRICE_MEI_MONTHLY);
}

/** Plano de uma assinatura do Stripe. Preço antigo do Forge Pro continua valendo como MEI. */
export function planForStripePrice(priceId: string | null | undefined): PaidPlanId {
  const pessoal = [stripePriceId("pessoal", "month"), stripePriceId("pessoal", "year")];
  return priceId && pessoal.includes(priceId) ? "pessoal" : "pro";
}
