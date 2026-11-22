import { planForStripePrice } from "@/lib/billing/config";
import { planName } from "@/lib/billing/plans";
import { stripeRequest } from "@/lib/billing/stripe";

import { buildPaidOrder, trackingFromMetadata, type StripeInvoiceLike } from "./utmify-core";

const ENDPOINT = "https://api.utmify.com.br/api-credentials/orders";

type InvoiceWithDetails = StripeInvoiceLike & {
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
  lines?: { data?: { pricing?: { price_details?: { price?: string } }; price?: { id?: string } | null }[] };
};

type Subscription = {
  metadata?: Record<string, string>;
  default_payment_method?: string | { type?: string } | null;
  items?: { data?: { price?: { id?: string; recurring?: { interval?: string } | null } | null }[] };
};

/**
 * Envia para a Utmify uma fatura paga do Stripe, com os UTMs guardados na
 * assinatura. Só roda com UTMIFY_API_TOKEN configurado e nunca derruba o webhook.
 */
export async function reportPaidInvoiceToUtmify(invoice: InvoiceWithDetails) {
  const token = process.env.UTMIFY_API_TOKEN?.trim();
  if (!token || !invoice.id) return;

  try {
    const subscriptionId =
      invoice.subscription ?? invoice.parent?.subscription_details?.subscription ?? null;
    const subscription = subscriptionId
      ? await stripeRequest<Subscription>("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`, {
          expand: ["default_payment_method"],
        })
      : null;

    const item = subscription?.items?.data?.[0];
    const priceId = item?.price?.id ?? null;
    const plan = planForStripePrice(priceId);
    const interval = item?.price?.recurring?.interval === "year" ? "anual" : "mensal";
    const methodType =
      typeof subscription?.default_payment_method === "object" ? subscription?.default_payment_method?.type : undefined;

    const order = buildPaidOrder({
      invoice,
      tracking: trackingFromMetadata(subscription?.metadata),
      product: { id: plan, name: planName(plan), planId: priceId, planName: interval },
      paymentMethod: methodType === "pix" ? "pix" : "credit_card",
    });

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-token": token },
      body: JSON.stringify(order),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("Utmify order error", response.status, (await response.text()).slice(0, 300));
  } catch (error) {
    console.error("Utmify order failed", (error as Error).message);
  }
}
