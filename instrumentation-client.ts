import { reportError } from "@/lib/monitoring";

// Erros no navegador. Só envia com NEXT_PUBLIC_SENTRY_DSN definido.
if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    void reportError(event.error ?? event.message, { source: "client", path: window.location.pathname });
  });
  window.addEventListener("unhandledrejection", (event) => {
    void reportError(event.reason, { source: "client", path: window.location.pathname });
  });
}
