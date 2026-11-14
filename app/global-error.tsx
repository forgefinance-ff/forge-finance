"use client";

import { reportError } from "@/lib/monitoring";
import { useEffect } from "react";

/** Último recurso: erro no layout raiz. Sem estilos do app (o layout caiu). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void reportError(error, { source: "client", path: window.location.pathname, digest: error.digest });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 22 }}>O Forge Finance teve um problema.</h1>
          <p style={{ color: "#555" }}>Seus dados estão seguros. Tente de novo em instantes.</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: 44, padding: "0 20px", borderRadius: 12, border: 0, background: "#111", color: "#fff", cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  );
}
