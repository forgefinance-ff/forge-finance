import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente mínimo da API do Stripe (sem dependência extra). Somente servidor:
 * usa STRIPE_SECRET_KEY, que nunca pode ir para o navegador.
 */
const API = "https://api.stripe.com/v1";

export class StripeError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StripeError";
    this.status = status;
  }
}

/** Codifica objetos no formato que o Stripe espera (a[b][0][c]=valor). */
function encode(value: unknown, key: string, out: string[]) {
  if (value === undefined || value === null) return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => encode(item, `${key}[${index}]`, out));
    return;
  }

  if (typeof value === "object") {
    for (const [childKey, child] of Object.entries(value as Record<string, unknown>)) {
      encode(child, key ? `${key}[${childKey}]` : childKey, out);
    }
    return;
  }

  out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
}

export async function stripeRequest<T>(
  method: "GET" | "POST",
  path: string,
  params?: Record<string, unknown>
): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new StripeError("STRIPE_SECRET_KEY ausente.", 500);

  const parts: string[] = [];
  if (params) encode(params, "", parts);
  const query = parts.join("&");

  const response = await fetch(method === "GET" && query ? `${API}${path}?${query}` : `${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: method === "POST" ? query : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null;

  if (!response.ok || !payload) {
    const message = payload?.error?.message ?? `stripe ${response.status}`;
    console.error("Stripe error", response.status, message.slice(0, 300));
    throw new StripeError(message, response.status);
  }

  return payload;
}

/**
 * Confere a assinatura do webhook (cabeçalho Stripe-Signature), como o SDK
 * oficial faz: HMAC-SHA256 de "timestamp.corpo" com o segredo do endpoint.
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!header) return false;

  let timestamp = "";
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value ?? "";
    if (key === "v1" && value) signatures.push(value);
  }

  const seconds = Number(timestamp);
  if (!timestamp || !Number.isFinite(seconds) || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - seconds) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest();

  return signatures.some((signature) => {
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}
