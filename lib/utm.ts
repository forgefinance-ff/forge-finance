/** Parâmetros de origem guardados da visita até a assinatura (cookie ff_utm). */
export const UTM_COOKIE = "ff_utm";
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "src", "sck"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const MAX_LENGTH = 200;

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().slice(0, MAX_LENGTH);
  return text ? text : null;
}

/** Lê os parâmetros conhecidos de uma query string (?utm_source=...). */
export function utmFromSearch(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = clean(params.get(key));
    if (value) out[key] = value;
  }
  return out;
}

/** Lê o cookie salvo, ignorando qualquer coisa fora da lista. Nunca lança erro. */
export function parseUtmCookie(raw: string | null | undefined): UtmParams {
  if (!raw) return {};
  try {
    const data = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const out: UtmParams = {};
    for (const key of UTM_KEYS) {
      const value = clean(data?.[key]);
      if (value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function serializeUtm(params: UtmParams): string {
  return encodeURIComponent(JSON.stringify(params));
}

/** Formato do metadata do Stripe: só as chaves preenchidas. */
export function utmMetadata(params: UtmParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    if (params[key]) out[key] = params[key] as string;
  }
  return out;
}
