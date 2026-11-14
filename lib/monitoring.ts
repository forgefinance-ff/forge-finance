/**
 * Relato de erros para o Sentry sem SDK (só fetch), no servidor e no
 * navegador. Sem DSN configurado não faz nada.
 *
 * Nada de dados pessoais: só tipo, mensagem e pilha do erro, a rota e o
 * ambiente. Nunca enviar valores, descrições de transações ou cookies.
 */

type Context = { path?: string; method?: string; source?: "server" | "client"; digest?: string };

function parseDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    if (!url.username || !projectId) return null;
    return { endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`, key: url.username, dsn };
  } catch {
    return null;
  }
}

function randomId() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function frames(stack?: string) {
  if (!stack) return undefined;
  const lines = stack.split("\n").slice(1, 30);
  return {
    frames: lines
      .map((line) => {
        const m = line.match(/at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
        return m ? { function: m[1] ?? "?", filename: m[2], lineno: Number(m[3]), colno: Number(m[4]) } : null;
      })
      .filter(Boolean)
      .reverse(),
  };
}

export async function reportError(error: unknown, context: Context = {}) {
  const dsnValue =
    context.source === "client" ? process.env.NEXT_PUBLIC_SENTRY_DSN : process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsnValue) return;
  const dsn = parseDsn(dsnValue);
  if (!dsn) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const eventId = randomId();
  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tags: { source: context.source ?? "server", ...(context.digest ? { digest: context.digest } : {}) },
    transaction: context.path,
    request: context.path ? { url: context.path, method: context.method } : undefined,
    exception: { values: [{ type: err.name, value: err.message.slice(0, 500), stacktrace: frames(err.stack) }] },
  };

  const body = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn: dsn.dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    await fetch(`${dsn.endpoint}?sentry_key=${dsn.key}&sentry_version=7`, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "content-type": "application/x-sentry-envelope" },
    });
  } catch {
    // Monitoramento nunca derruba o app.
  }
}
