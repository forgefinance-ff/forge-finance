import { NextResponse } from "next/server";

import { billingEnabled, stripePriceId } from "@/lib/billing/config";
import { stripeRequest } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Formulário da página /planos → cria a sessão de pagamento no Stripe e redireciona. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const back = (status: string) => NextResponse.redirect(`${origin}/planos?checkout=${status}`, 303);

  if (!billingEnabled()) return back("em-breve");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/login?next=/planos`, 303);

  const form = await request.formData().catch(() => null);
  const interval = form?.get("interval") === "year" ? "year" : "month";
  const priceId = stripePriceId(interval);

  if (!priceId) {
    console.error("Checkout: preço do Stripe não configurado", interval);
    return back("erro");
  }

  try {
    const admin = createAdminClient();

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

    if (entitlement?.plan_id === "pro" && (entitlement.status === "active" || entitlement.status === "past_due")) {
      return NextResponse.redirect(`${origin}/assinatura?checkout=ja-assinante`, 303);
    }

    let customerId = entitlement?.provider_customer_id ?? null;

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

    const session = await stripeRequest<{ url: string }>("POST", "/checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "pt-BR",
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${origin}/assinatura?checkout=sucesso`,
      cancel_url: `${origin}/planos?checkout=cancelado`,
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Checkout error", (error as Error).message);
    return back("erro");
  }
}
