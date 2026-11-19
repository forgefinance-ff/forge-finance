import type { SupabaseClient } from "@supabase/supabase-js";

import { isPaidPlan } from "./plans";
import { stripeRequest } from "./stripe";

/**
 * Garante a linha de acesso do usuário e um cliente no Stripe ligado a ele.
 * Devolve o id do cliente e se ele já é assinante ativo de um plano pago.
 */
export async function ensureStripeCustomer(
  admin: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<{ customerId: string; alreadySubscribed: boolean }> {
  await admin
    .from("user_entitlements")
    .upsert({ user_id: user.id, plan_id: "free", status: "beta", access_source: "beta" }, {
      onConflict: "user_id",
      ignoreDuplicates: true,
    });

  const { data: entitlement } = await admin
    .from("user_entitlements")
    .select("plan_id, status, provider_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const alreadySubscribed =
    isPaidPlan(entitlement?.plan_id) && (entitlement?.status === "active" || entitlement?.status === "past_due");

  let customerId: string | null = entitlement?.provider_customer_id ?? null;

  if (!customerId) {
    const customer = await stripeRequest<{ id: string }>("POST", "/customers", {
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;

    await admin
      .from("user_entitlements")
      .update({ provider_customer_id: customerId, billing_provider: "stripe", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  return { customerId, alreadySubscribed };
}
