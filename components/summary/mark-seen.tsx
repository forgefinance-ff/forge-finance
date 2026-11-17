"use client";

import { useEffect } from "react";

import { SUMMARY_SEEN_COOKIE } from "@/lib/summary-cookie";

/** Marca o resumo do mês como visto (o aviso no dashboard some). */
export function markSummarySeen(month: string) {
  document.cookie = `${SUMMARY_SEEN_COOKIE}=${month}; path=/; max-age=${60 * 60 * 24 * 60}; samesite=lax`;
}

export function MarkSummarySeen({ month }: { month: string }) {
  useEffect(() => markSummarySeen(month), [month]);
  return null;
}
