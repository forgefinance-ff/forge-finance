import type { BillingInterval, PaidPlanId } from "./plans";

/**
 * Cobrança desligada por padrão. Só liga com BILLING_ENABLED=true na Vercel.
 * Desligada: ninguém consegue assinar e o WhatsApp continua liberado para todos.
 */
export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
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
