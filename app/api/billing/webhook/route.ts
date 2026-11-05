import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { verifyStripeSignature } from "@/lib/billing/stripe";
import { syncSubscription } from "@/lib/billing/sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

/** Descobre a assinatura ligada ao evento (o formato muda entre versões da API). */
function subscriptionIdOf(event: StripeEvent): string | null {
  const object = event.data.object;

  if (event.type.startsWith("customer.subscription.")) {
    return typeof object.id === "string" ? object.id : null;
  }

  const direct = object.subscription;
  if (typeof direct === "string") return direct;

  const parent = object.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  const nested = parent?.subscription_details?.subscription;
  return typeof nested === "string" ? nested : null;
}

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook: STRIPE_WEBHOOK_SECRET ausente.");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const payload = await request.text();

  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  const subscriptionId = subscriptionIdOf(event);
  if (!subscriptionId) return NextResponse.json({ received: true });

  const admin = createAdminClient();

  // O Stripe pode reenviar o mesmo evento: processa uma vez só.
  const { error: dedupeError } = await admin.from("billing_events").insert({ id: event.id, type: event.type });
  if (dedupeError) {
    if (dedupeError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error("Stripe webhook dedupe error", dedupeError.code);
    return NextResponse.json({ error: "storage" }, { status: 500 });
  }

  try {
    await syncSubscription(admin, subscriptionId);
  } catch (error) {
    // Libera o evento para o Stripe tentar de novo.
    await admin.from("billing_events").delete().eq("id", event.id);
    console.error("Stripe webhook error", (error as Error).message);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }

  revalidatePath("/assinatura");
  revalidatePath("/planos");

  return NextResponse.json({ received: true });
}
