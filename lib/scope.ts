/** Escopo dos dados: finanças pessoais ou da empresa (MEI). */
export type Scope = "personal" | "business";

export const SCOPE_COOKIE = "ff_scope";

/** Marca que o usuário já respondeu à oferta de padrões da empresa. */
export const BUSINESS_ONBOARDING_COOKIE = "ff_business_onboarding";

export const SCOPE_LABEL: Record<Scope, string> = {
  personal: "Pessoal",
  business: "Empresa",
};

export const SCOPE_EMOJI: Record<Scope, string> = {
  personal: "👤",
  business: "🏢",
};

export function parseScope(value: unknown): Scope {
  return value === "business" ? "business" : "personal";
}
