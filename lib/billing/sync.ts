import type { SupabaseClient } from "@supabase/supabase-js";

import { stripeRequest } from "./stripe";

type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  items?: {
    data?: {
      current_period_end?: number;
      price?: { recurring?: { interval?: string } | null } | null;
    }[];
  };
};

/** Status do Stripe que dão acesso ao Forge Pro. past_due = cobrança falhou, Stripe ainda está tentando. */
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Busca a assinatura atual no Stripe e grava o acesso do usuário.
 * Sempre relê no Stripe (em vez de confiar no corpo do evento), então eventos
 * fora de ordem não deixam o acesso desatualizado.
 */
export async function syncSubscription(admin: SupabaseClient, subscriptionId: string) {
  const sub = await stripeRequest<StripeSubscription>("GET", `/subscriptions/${encodeURIComponent(subscriptionId)}`);

  let userId = sub.metadata?.user_id ?? null;

  if (!userId) {
    const { data } = await admin
      .from("user_entitlements")
      .select("user_id")
      .eq("provider_customer_id", sub.customer)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  if (!userId) {
    console.error("Stripe sync: usuário não encontrado", sub.id);
    return;
  }

  const { data: current } = await admin
    .from("user_entitlements")
    .select("plan_id, status, provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  const item = sub.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null;
  const hasAccess = ACCESS_STATUSES.has(sub.status);

  // Uma assinatura antiga cancelada não pode derrubar outra mais nova que está ativa.
  if (
    !hasAccess &&
    current?.provider_subscription_id &&
    current.provider_subscription_id !== sub.id &&
    current.plan_id === "pro" &&
    (current.status === "active" || current.status === "past_due")
  ) {
    return;
  }

  const base = {
    user_id: userId,
    access_source: "subscription",
    billing_provider: "stripe",
    provider_customer_id: sub.customer,
    provider_subscription_id: sub.id,
    updated_at: new Date().toISOString(),
  };

  const row = hasAccess
    ? {
        ...base,
        plan_id: "pro",
        status: sub.status === "past_due" ? "past_due" : "active",
        billing_interval: item?.price?.recurring?.interval === "year" ? "year" : "month",
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      }
    : {
        ...base,
        plan_id: "free",
        status: "canceled",
        billing_interval: null,
        current_period_end: null,
        cancel_at_period_end: false,
      };

  const { error } = await admin.from("user_entitlements").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`Stripe sync: falha ao gravar acesso (${error.code})`);
}
