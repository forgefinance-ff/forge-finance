import type { Instrumentation } from "next";

import { reportError } from "@/lib/monitoring";

/**
 * Erros do servidor vão para o Sentry (só com SENTRY_DSN definido).
 * Sem a variável, nada é enviado e o app funciona igual.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  await reportError(error, {
    source: "server",
    // Só o caminho, sem a query string (pode ter termos de busca).
    path: request.path.split("?")[0],
    method: request.method,
    digest: (error as { digest?: string }).digest,
  });
};
