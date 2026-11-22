/** Monta o pedido no formato da API da Utmify (POST /api-credentials/orders). */

export type UtmifyTracking = {
  src: string | null;
  sck: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

export type StripeInvoiceLike = {
  id?: string;
  livemode?: boolean;
  created?: number;
  amount_paid?: number;
  currency?: string;
  customer_email?: string | null;
  customer_name?: string | null;
  status_transitions?: { paid_at?: number | null } | null;
};

/** Data no formato que a Utmify pede: "YYYY-MM-DD HH:MM:SS" em UTC. */
export function utmifyDate(unixSeconds: number | null | undefined): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toISOString().slice(0, 19).replace("T", " ");
}

export function trackingFromMetadata(metadata: Record<string, string> | null | undefined): UtmifyTracking {
  const value = (key: string) => {
    const text = metadata?.[key]?.trim();
    return text ? text.slice(0, 200) : null;
  };
  return {
    src: value("src"),
    sck: value("sck"),
    utm_source: value("utm_source"),
    utm_campaign: value("utm_campaign"),
    utm_medium: value("utm_medium"),
    utm_content: value("utm_content"),
    utm_term: value("utm_term"),
  };
}

export function buildPaidOrder(opts: {
  invoice: StripeInvoiceLike;
  tracking: UtmifyTracking;
  product: { id: string; name: string; planId: string | null; planName: string | null };
  paymentMethod: "credit_card" | "pix";
}) {
  const { invoice } = opts;
  const total = Math.max(0, Math.round(invoice.amount_paid ?? 0));
  const paidAt = invoice.status_transitions?.paid_at ?? invoice.created;

  return {
    orderId: invoice.id ?? "",
    platform: "ForgeFinance",
    paymentMethod: opts.paymentMethod,
    status: "paid",
    createdAt: utmifyDate(invoice.created),
    approvedDate: utmifyDate(paidAt),
    refundedAt: null,
    customer: {
      name: invoice.customer_name?.trim() || invoice.customer_email || "Cliente",
      email: invoice.customer_email ?? "",
      phone: null,
      document: null,
      country: "BR",
    },
    products: [
      {
        id: opts.product.id,
        name: opts.product.name,
        planId: opts.product.planId,
        planName: opts.product.planName,
        quantity: 1,
        priceInCents: total,
      },
    ],
    trackingParameters: opts.tracking,
    commission: {
      totalPriceInCents: total,
      gatewayFeeInCents: 0,
      userCommissionInCents: total,
      currency: (invoice.currency ?? "brl").toUpperCase(),
    },
    // Pagamento do modo de teste do Stripe: a Utmify só valida, não salva.
    isTest: invoice.livemode === false,
  };
}
