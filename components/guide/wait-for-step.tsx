"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Enquanto a pessoa faz o passo no WhatsApp, recarrega os dados da página a
 * cada poucos segundos. Quando o passo conclui, o servidor para de renderizar
 * este componente e a checagem acaba sozinha.
 */
export function WaitForStep({ everyMs = 4000 }: { everyMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [router, everyMs]);

  return null;
}
