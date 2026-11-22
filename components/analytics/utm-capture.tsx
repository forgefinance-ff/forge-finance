"use client";

import Script from "next/script";
import { useEffect } from "react";

import { UTM_COOKIE, serializeUtm, utmFromSearch } from "@/lib/utm";

const UTMIFY_ENABLED = process.env.NEXT_PUBLIC_UTMIFY_ENABLED === "true";
/** ID do Pixel na Utmify (Pixels > Código do Pixel). Só letras e números. */
const RAW_PIXEL = process.env.NEXT_PUBLIC_UTMIFY_PIXEL_ID?.trim() ?? "";
const UTMIFY_PIXEL_ID = /^[a-f0-9]{24}$/i.test(RAW_PIXEL) ? RAW_PIXEL : "";
const NINETY_DAYS = 60 * 60 * 24 * 90;

/**
 * Guarda os parâmetros do anúncio (utm_*, src, sck) num cookie por 90 dias,
 * para a assinatura feita depois ainda saber de qual anúncio a pessoa veio.
 * Com a Utmify ligada, carrega também o script de UTMs dela.
 */
export function UtmCapture() {
  useEffect(() => {
    const params = utmFromSearch(window.location.search);
    if (!Object.keys(params).length) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${UTM_COOKIE}=${serializeUtm(params)}; Path=/; Max-Age=${NINETY_DAYS}; SameSite=Lax${secure}`;
  }, []);

  if (!UTMIFY_ENABLED) return null;

  return (
    <>
      <Script
        id="utmify-utms"
        src="https://cdn.utmify.com.br/scripts/utms/latest.js"
        data-utmify-prevent-xcod-sck=""
        data-utmify-prevent-subids=""
        data-utmify-is-stripe=""
        strategy="afterInteractive"
      />
      {UTMIFY_PIXEL_ID && (
        <>
          {/* Pixel da Utmify: mesmo código que o painel gera, sem a ofuscação. */}
          <Script id="utmify-pixel-id" strategy="afterInteractive">{`window.pixelId="${UTMIFY_PIXEL_ID}";`}</Script>
          <Script id="utmify-pixel" src="https://cdn.utmify.com.br/scripts/pixel/pixel.js" strategy="afterInteractive" />
        </>
      )}
    </>
  );
}
