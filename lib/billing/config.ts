import type { BillingInterval } from "./plans";

/**
 * Cobrança desligada por padrão. Só liga com BILLING_ENABLED=true na Vercel.
 * Desligada: ninguém consegue assinar e o WhatsApp continua liberado para
 * todos (modo beta).
 */
export function billingEnabled(): boolean {
  return process.env.BILLING_ENABLED === "true";
}

export function stripePriceId(interval: BillingInterval): string | null {
  const id =
    interval === "year" ? process.env.STRIPE_PRICE_PRO_YEARLY : process.env.STRIPE_PRICE_PRO_MONTHLY;
  return id?.trim() || null;
}
