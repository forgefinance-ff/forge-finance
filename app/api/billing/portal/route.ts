import { NextResponse } from "next/server";

import { stripeRequest } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Portal do assinante do Stripe: trocar cartão, cancelar, ver recibos. */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(`${origin}/login?next=/assinatura`, 303);

  const { data: entitlement } = await supabase
    .from("user_entitlements")
    .select("provider_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!entitlement?.provider_customer_id) {
    return NextResponse.redirect(`${origin}/planos`, 303);
  }

  try {
    const session = await stripeRequest<{ url: string }>("POST", "/billing_portal/sessions", {
      customer: entitlement.provider_customer_id,
      return_url: `${origin}/assinatura`,
      locale: "pt-BR",
    });

    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error("Portal error", (error as Error).message);
    return NextResponse.redirect(`${origin}/assinatura?portal=erro`, 303);
  }
}
