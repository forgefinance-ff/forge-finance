"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** ID do Pixel (conjunto de dados) da Meta. Vazio = Pixel desligado. */
const RAW_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "";
const PIXEL_ID = /^\d{5,20}$/.test(RAW_ID) ? RAW_ID : "";

type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Envia um evento padrão da Meta (ex.: CompleteRegistration). Espera o Pixel carregar. */
export function trackMetaEvent(event: string, params?: Record<string, unknown>, attempt = 0) {
  if (!PIXEL_ID || typeof window === "undefined") return;
  if (window.fbq) {
    window.fbq("track", event, params);
    return;
  }
  if (attempt < 20) window.setTimeout(() => trackMetaEvent(event, params, attempt + 1), 250);
}

/** Pixel da Meta: carrega o script e conta cada página vista, inclusive nas trocas de rota. */
export function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!PIXEL_ID) return;
    // A primeira visita já é contada pelo script abaixo.
    if (first.current) {
      first.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (!PIXEL_ID) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
    </Script>
  );
}

/** Dispara um evento uma vez por página aberta (não repete ao atualizar a mesma URL). */
export function MetaEvent({ event, params }: { event: string; params?: Record<string, unknown> }) {
  useEffect(() => {
    if (!PIXEL_ID) return;
    const key = `ff_meta_${event}_${window.location.pathname}${window.location.search}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sem sessionStorage, envia mesmo assim
    }
    trackMetaEvent(event, params);
  }, [event, params]);

  return null;
}
