"use client";

import { useEffect } from "react";

// Importar o store aqui faz ele começar a escutar o "beforeinstallprompt" logo no início.
import "./install-store";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Sem service worker o site continua funcionando normalmente.
    });
  }, []);

  return null;
}
