import { cache } from "react";
import { cookies } from "next/headers";

import { hasBusinessAccess } from "@/lib/billing/access";
import { parseScope, SCOPE_COOKIE, type Scope } from "@/lib/scope";
import { createClient, getAuthUser } from "@/lib/supabase/server";

/** O usuário logado pode usar o escopo Empresa? (verificado no servidor) */
export const canUseBusiness = cache(async (): Promise<boolean> => {
  const user = await getAuthUser();
  if (!user) return false;
  return hasBusinessAccess(await createClient(), user.id);
});

/**
 * Escopo ativo (cookie). Sem cookie, vale "Pessoal". Quem não tem o plano
 * com Empresa sempre vê "Pessoal", mesmo que o cookie diga outra coisa.
 */
export const getActiveScope = cache(async (): Promise<Scope> => {
  const cookieStore = await cookies();
  const scope = parseScope(cookieStore.get(SCOPE_COOKIE)?.value);
  if (scope === "business" && !(await canUseBusiness())) return "personal";
  return scope;
});
