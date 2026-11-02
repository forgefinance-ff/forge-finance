/**
 * Resultado das server actions das telas do MEI. Erros voltam como texto em
 * português (em produção o Next esconde a mensagem de exceções lançadas).
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

export function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof Error && error.message) {
    return { ok: false, error: error.message };
  }

  if (typeof error === "object" && error && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message) return { ok: false, error: message };
  }

  return { ok: false, error: fallback };
}
