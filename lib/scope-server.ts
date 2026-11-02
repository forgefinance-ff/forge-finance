import { cookies } from "next/headers";

import { parseScope, SCOPE_COOKIE, type Scope } from "@/lib/scope";

/** Escopo ativo (cookie). Sem cookie, vale "Pessoal". */
export async function getActiveScope(): Promise<Scope> {
  const cookieStore = await cookies();
  return parseScope(cookieStore.get(SCOPE_COOKIE)?.value);
}
