"use client";

import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Formulário de pagamento do Stripe EMBUTIDO na página (iframe do Stripe).
 * Os dados do cartão vão direto para o Stripe; o Forge nunca os vê.
 */

const STRIPE_JS = "https://js.stripe.com/endive/stripe.js";

type EmbeddedInstance = { mount: (el: HTMLElement | string) => void; destroy: () => void };
type StripeInstance = {
  createEmbeddedCheckoutPage?: (options: { fetchClientSecret: () => Promise<string> }) => Promise<EmbeddedInstance>;
  initEmbeddedCheckout?: (options: { fetchClientSecret: () => Promise<string> }) => Promise<EmbeddedInstance>;
};

declare global {
  interface Window {
    Stripe?: (key: string, options?: { locale?: string }) => StripeInstance;
  }
}

let loader: Promise<void> | null = null;

function loadStripeJs(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  if (loader) return loader;

  loader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = STRIPE_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loader = null;
      reject(new Error("stripe_js"));
    };
    document.head.appendChild(script);
  });

  return loader;
}

export function EmbeddedCheckout({ interval }: { interval: "month" | "year" }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    let checkout: EmbeddedInstance | null = null;
    let cancelled = false;
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    async function start() {
      setState("loading");

      if (!key) {
        setMessage("Pagamento ainda não configurado.");
        setState("error");
        return;
      }

      try {
        await loadStripeJs();
        if (cancelled || !window.Stripe) return;

        const stripe = window.Stripe(key, { locale: "pt-BR" });
        const create = stripe.createEmbeddedCheckoutPage ?? stripe.initEmbeddedCheckout;
        if (!create) throw new Error("stripe_embedded_unavailable");

        const fetchClientSecret = async () => {
          const response = await fetch("/api/billing/embedded", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interval }),
          });
          const data = (await response.json()) as { clientSecret?: string; error?: string; redirect?: string };

          if (data.redirect) {
            router.replace(data.redirect);
            throw new Error("redirect");
          }
          if (!response.ok || !data.clientSecret) throw new Error(data.error || "checkout_error");
          return data.clientSecret;
        };

        checkout = await create.call(stripe, { fetchClientSecret });
        if (cancelled) {
          checkout.destroy();
          return;
        }

        if (container.current) checkout.mount(container.current);
        setState("ready");
      } catch (error) {
        if (cancelled || (error as Error).message === "redirect") return;
        const text = (error as Error).message;
        setMessage(
          text && !text.startsWith("stripe_") && text !== "checkout_error"
            ? text
            : "Não conseguimos carregar o pagamento. Atualize a página e tente de novo."
        );
        setState("error");
      }
    }

    void start();

    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [interval, router]);

  return (
    <div className="relative min-h-[520px]">
      {state === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm text-[#5b5575]">
          <Loader2Icon className="h-6 w-6 animate-spin text-violet-600" />
          Carregando pagamento seguro…
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-red-600">{message}</div>
      )}
      <div ref={container} />
    </div>
  );
}
