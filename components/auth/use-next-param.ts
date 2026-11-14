"use client";

import { useClientValue } from "@/hooks/use-client-value";

/** Só aceita caminhos internos (evita redirecionar para outro site). */
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}

/** Lê o ?next= da URL (para voltar ao fluxo certo depois do login/cadastro). */
export function useNextParam() {
  return useClientValue(() => safeNext(new URLSearchParams(window.location.search).get("next")), null);
}

export function withNext(path: string, next: string | null) {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
