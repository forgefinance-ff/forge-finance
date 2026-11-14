"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** Lê um valor que só existe no navegador (URL, localStorage) sem setState em efeito. */
export function useClientValue<T extends string | number | boolean | null>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noop, read, () => serverValue);
}

const REDUCED = "(prefers-reduced-motion: reduce)";

/** true quando o sistema pede menos movimento. Atualiza se a preferência mudar. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false
  );
}
