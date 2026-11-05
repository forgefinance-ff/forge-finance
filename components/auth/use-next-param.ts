"use client";

import { useEffect, useState } from "react";

/** Só aceita caminhos internos (evita redirecionar para outro site). */
export function safeNext(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}

/** Lê o ?next= da URL (para voltar ao fluxo certo depois do login/cadastro). */
export function useNextParam() {
  const [next, setNext] = useState<string | null>(null);

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get("next")));
  }, []);

  return next;
}

export function withNext(path: string, next: string | null) {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}
