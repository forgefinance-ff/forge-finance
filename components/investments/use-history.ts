"use client";

import { useEffect, useState } from "react";

import type { Candle } from "@/components/investments/market-chart";
import type { HistoryRange } from "@/lib/market/symbols";

export type HistoryState = {
  key: string;
  points: Candle[];
  previousClose: number | null;
  fetchedAt: number;
  error?: string;
};

const LIVE_MS = 30_000;

/**
 * Busca os candles de um ativo ou índice. No período "Hoje" atualiza sozinho
 * a cada 30 s enquanto a aba estiver visível.
 */
export function useHistory(query: string | null, range: HistoryRange) {
  const key = query ? `${query}&range=${range}` : "";
  const [state, setState] = useState<HistoryState | null>(null);

  useEffect(() => {
    if (!key) return;
    let alive = true;

    const load = () =>
      fetch(`/api/market/history?${key}`, { cache: "no-store" })
        .then(async (res) => {
          const json = await res.json();
          if (!alive) return;
          if (res.ok) {
            setState({ key, points: json.points, previousClose: json.previousClose ?? null, fetchedAt: Date.now() });
          } else {
            setState((prev) =>
              prev?.key === key && prev.points.length
                ? prev
                : { key, points: [], previousClose: null, fetchedAt: Date.now(), error: json.error }
            );
          }
        })
        .catch(() => {
          if (!alive) return;
          setState((prev) =>
            prev?.key === key && prev.points.length
              ? prev
              : { key, points: [], previousClose: null, fetchedAt: Date.now(), error: "Sem conexão para carregar o gráfico." }
          );
        });

    void load();
    const live = range === "1d" || range === "5d";
    const id = live
      ? setInterval(() => {
          if (document.visibilityState === "visible") void load();
        }, range === "1d" ? LIVE_MS : LIVE_MS * 4)
      : null;

    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [key, range]);

  const current = state && state.key === key ? state : null;
  return { data: current, loading: !!key && !current };
}
