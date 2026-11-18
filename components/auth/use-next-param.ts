"use client";

import { useClientValue } from "@/hooks/use-client-value";
import { safeNext } from "@/lib/safe-next";

export { safeNext };

/** Lê o ?next= da URL (para voltar ao fluxo certo depois do login/cadastro). */
export function useNextParam() {
  return useClientValue(() => safeNext(new URLSearchParams(window.location.search).get("next")), null);
}

export function withNext(path: string, next: string | null) {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
