"use client";

import { reportError } from "@/lib/monitoring";
import Link from "next/link";
import { useEffect } from "react";

/** Erro inesperado numa página: mensagem em português e "tentar de novo". */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void reportError(error, { source: "client", path: window.location.pathname, digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">Algo deu errado aqui.</h1>
      <p className="text-muted-foreground">
        Seus dados estão seguros. Tente de novo; se continuar, recarregue a página.
        {error.digest ? <span className="mt-2 block text-xs text-faint">Código: {error.digest}</span> : null}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background"
        >
          Tentar de novo
        </button>
        <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 text-sm">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
