import { formatDateBR } from "@/lib/dates";
import { SCOPE_EMOJI, SCOPE_LABEL, type Scope } from "@/lib/scope";
import { ServiceError } from "@/lib/services/context";

import { REF_LABEL, type Entity, type RefKind, type UserContext } from "./context";

export type Args = Record<string, unknown>;

/* ---------- JSON Schema enxuto para as ferramentas ---------- */

export const s = {
  str: (description: string) => ({ type: "string", description }),
  num: (description: string) => ({ type: "number", description }),
  bool: (description: string) => ({ type: "boolean", description }),
  enum: (values: string[], description: string) => ({ type: "string", enum: values, description }),
  date: (description: string) => ({ type: "string", description: `${description} (YYYY-MM-DD)` }),
  scope: () => ({
    type: "string",
    enum: ["pessoal", "empresa"],
    description: "Escopo: pessoal ou empresa (MEI). Omita para usar o escopo da conta padrão.",
  }),
};

export function obj(properties: Record<string, unknown>, required: string[] = []) {
  return { type: "object", properties, required };
}

/* ---------- leitura dos argumentos da IA ---------- */

export function str(args: Args, key: string): string | null {
  const value = args[key];
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function num(args: Args, key: string): number | null {
  const value = args[key];
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function bool(args: Args, key: string): boolean | null {
  const value = args[key];
  return typeof value === "boolean" ? value : null;
}

/** Busca uma entidade pela referência (ex.: "A2"). */
export function ref(ctx: UserContext, value: unknown, kind: RefKind): Entity {
  const key = String(value ?? "").trim().toUpperCase();
  const entity = ctx.entities.get(key);

  if (!entity || entity.ref[0] !== kind) {
    throw new ServiceError(`Não encontrei essa ${REF_LABEL[kind]} (${key || "sem referência"}).`);
  }

  return entity;
}

export function optionalRef(ctx: UserContext, value: unknown, kind: RefKind): Entity | null {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return ref(ctx, value, kind);
}

export function scopeArg(args: Args): Scope | null {
  const value = str(args, "escopo");
  if (value === "empresa") return "business";
  if (value === "pessoal") return "personal";
  return null;
}

/** Escopo da conta padrão; sem conta padrão, Pessoal. */
export function defaultScope(ctx: UserContext): Scope {
  const account = ctx.byKind("A").find((a) => a.id === ctx.defaultAccountId);
  return account?.scope ?? "personal";
}

export function scopeTag(scope: Scope) {
  return `${SCOPE_EMOJI[scope]} ${SCOPE_LABEL[scope]}`;
}

export function brDate(value: string | null | undefined) {
  return value ? formatDateBR(value) : "—";
}

/**
 * Conta para um lançamento: a citada; senão a padrão (se for do escopo);
 * senão a única conta do escopo.
 */
export function pickAccount(ctx: UserContext, value: unknown, scope: Scope | null): Entity {
  const cited = optionalRef(ctx, value, "A");
  if (cited) return cited;

  const accounts = ctx.byKind("A");
  const fallback = accounts.find((a) => a.id === ctx.defaultAccountId);
  if (fallback && (!scope || fallback.scope === scope)) return fallback;

  const inScope = accounts.filter((a) => !scope || a.scope === scope);
  if (inScope.length === 1) return inScope[0];

  throw new ServiceError(
    accounts.length === 0
      ? "Você ainda não tem nenhuma conta cadastrada. Crie uma conta primeiro."
      : "Em qual conta? Diga o nome da conta."
  );
}

/** Categoria do tipo e escopo certos; sem categoria citada, usa "Outros". */
export function pickCategory(
  ctx: UserContext,
  value: unknown,
  type: "income" | "expense",
  scope: Scope
): Entity | null {
  const cited = optionalRef(ctx, value, "K");

  if (cited) {
    if (cited.scope !== scope) {
      throw new ServiceError(
        `A categoria ${cited.name} é do escopo ${SCOPE_LABEL[cited.scope]}, mas a conta é do escopo ${SCOPE_LABEL[scope]}.`
      );
    }
    if (cited.data.type !== type) {
      throw new ServiceError(
        `A categoria ${cited.name} é de ${cited.data.type === "income" ? "receita" : "despesa"}.`
      );
    }
    return cited;
  }

  return (
    ctx
      .byKind("K")
      .find((k) => k.scope === scope && k.data.type === type && k.name.toLowerCase() === "outros") ?? null
  );
}
