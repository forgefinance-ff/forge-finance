"use client";

// Guarda o pedido de instalação do navegador (Android/Chrome/Edge) e diz em que
// aparelho a pessoa está, para mostrar a instrução certa.
import { useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type Platform = "ios" | "android" | "desktop";
export type Browser = "safari" | "chrome" | "edge" | "samsung" | "firefox" | "inapp" | "other";

type InstallState = {
  ready: boolean;
  platform: Platform;
  browser: Browser;
  installed: boolean;
  canPrompt: boolean;
};

const SERVER_STATE: InstallState = {
  ready: false,
  platform: "desktop",
  browser: "other",
  installed: false,
  canPrompt: false,
};

/** Marca no aparelho que a pessoa já instalou (ou disse que instalou). */
export const INSTALLED_KEY = "ff_app_installed";

let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
let state: InstallState = SERVER_STATE;
const listeners = new Set<() => void>();

function detect(): InstallState {
  const ua = navigator.userAgent;
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const platform: Platform = /iPhone|iPad|iPod/i.test(ua) || isIpadOs ? "ios" : /Android/i.test(ua) ? "android" : "desktop";

  let browser: Browser = "other";
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Bytedance|Twitter|LinkedInApp|GSA\//i.test(ua)) browser = "inapp";
  else if (/SamsungBrowser/i.test(ua)) browser = "samsung";
  else if (/EdgiOS|EdgA|Edg\//i.test(ua)) browser = "edge";
  else if (/FxiOS|Firefox/i.test(ua)) browser = "firefox";
  else if (/CriOS|Chrome/i.test(ua)) browser = "chrome";
  else if (/Safari/i.test(ua)) browser = "safari";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return {
    ready: true,
    platform,
    browser,
    installed: standalone || justInstalled,
    canPrompt: Boolean(deferred),
  };
}

function emit() {
  state = detect();
  listeners.forEach((l) => l());
}

let started = false;
function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // nós mostramos o botão na hora certa
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    justInstalled = true;
    try {
      localStorage.setItem(INSTALLED_KEY, "1");
    } catch {}
    emit();
  });

  state = detect();
}

// Começa a escutar assim que o módulo carrega no navegador.
start();

/** Abre a janela nativa "Instalar app" (só Android/Chrome/Edge). */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  emit();
  return outcome === "accepted";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (cb) => {
      start();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => SERVER_STATE
  );
}
