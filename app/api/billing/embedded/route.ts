import { NextResponse } from "next/server";

import { billingEnabled, stripePriceId } from "@/lib/billing/config";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import { StripeError, stripeRequest } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Cria a sessão do checkout EMBUTIDO (o formulário do Stripe aparece dentro
 * da página /assinar) e devolve o client_secret para o navegador montar.
 */
export async function POST(request: Request) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: "As assinaturas abrem ao fim do beta." }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Entre na sua conta para assinar." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { interval?: string } | null;
  const interval = body?.interval === "month" ? "month" : "year";
  const priceId = stripePriceId(interval);

  if (!priceId) {
    console.error("Embedded checkout: preço do Stripe não configurado", interval);
    return NextResponse.json({ error: "Pagamento indisponível no momento." }, { status: 500 });
  }

  const origin = new URL(request.url).origin;

  try {
    const { customerId, alreadyPro } = await ensureStripeCustomer(createAdminClient(), user);

    if (alreadyPro) {
      return NextResponse.json({ error: "Você já é Forge Pro.", redirect: "/assinatura" }, { status: 409 });
    }

    const params = {
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      locale: "pt-BR",
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
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
