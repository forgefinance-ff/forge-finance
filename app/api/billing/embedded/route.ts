import { NextResponse } from "next/server";

import { billingEnabled, pixPaymentOptions, stripePriceId } from "@/lib/billing/config";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import { parsePaidPlan } from "@/lib/billing/plans";
import { UTM_COOKIE, parseUtmCookie, utmMetadata } from "@/lib/utm";
import { StripeError, stripeRequest } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function cookieValue(request: Request, name: string): string | null {
  const match = (request.headers.get("cookie") ?? "").split(/;\s*/).find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

/**
 * Cria a sessão do checkout EMBUTIDO (o formulário do Stripe aparece dentro
 * da página /assinar) e devolve o client_secret para o navegador montar.
 */
export async function POST(request: Request) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: "As assinaturas abrem em breve." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Entre na sua conta para assinar." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { interval?: string; plan?: string } | null;
  const interval = body?.interval === "month" ? "month" : "year";
  const plan = parsePaidPlan(body?.plan);
  const priceId = stripePriceId(plan, interval);

  if (!priceId) {
    console.error("Embedded checkout: preço do Stripe não configurado", plan, interval);
    return NextResponse.json({ error: "Pagamento indisponível no momento." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;

  try {
    const { customerId, alreadySubscribed } = await ensureStripeCustomer(createAdminClient(), user);

    // Uma assinatura por pessoa: trocar de plano é feito em Plano e assinatura.
    if (alreadySubscribed) {
      return NextResponse.json({ error: "Você já tem um plano ativo.", redirect: "/assinatura" }, { status: 409 });
    }

    const params = {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "pt-BR",
      metadata: { user_id: user.id },
      subscription_data: { metadata: { ...utmMetadata(parseUtmCookie(cookieValue(request, UTM_COOKIE))), user_id: user.id } },
      ...pixPaymentOptions(),
      return_url: `${origin}/assinatura?checkout=sucesso&session_id={CHECKOUT_SESSION_ID}`,
    };

    let session: { client_secret: string };

    try {
      session = await stripeRequest<{ client_secret: string }>("POST", "/checkout/sessions", {
        ...params,
        ui_mode: "embedded_page",
      });
    } catch (error) {
      // Contas em versões antigas da API usam o nome anterior ("embedded").
      if (!(error instanceof StripeError) || error.status !== 400 || !/ui_mode/i.test(error.message)) throw error;
      session = await stripeRequest<{ client_secret: string }>("POST", "/checkout/sessions", {
        ...params,
        ui_mode: "embedded",
      });
    }

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Embedded checkout error", (error as Error).message);
    return NextResponse.json({ error: "Não conseguimos abrir o pagamento agora. Tente de novo." }, { status: 500 });
  }
}
