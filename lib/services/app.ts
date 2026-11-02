import { getActiveScope } from "@/lib/scope-server";
import { appAtomic, errorMessage, ServiceError, type ServiceCtx } from "@/lib/services/context";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";

/** Contexto do usuário logado no app (RLS ativa, escopo do cookie). */
export async function appCtx(): Promise<ServiceCtx> {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) throw new ServiceError("Sua sessão expirou. Entre novamente.");

  return { db, userId: user.id, scope: await getActiveScope(), atomic: appAtomic(db) };
}

/** Roda um serviço e devolve { ok } ou a mensagem de erro em português. */
export async function runAction(
  fn: (ctx: ServiceCtx) => Promise<unknown>,
  fallback: string
): Promise<ActionResult> {
  try {
    await fn(await appCtx());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorMessage(error, fallback) };
  }
}
