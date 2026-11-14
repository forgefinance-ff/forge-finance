import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Intencionalmente vazio.
          // Cookies só podem ser alterados em Server Actions,
          // Route Handlers ou Middleware/Proxy.
        },
      },
    }
  );
}
export type AuthUser = {
  id: string;
  email?: string;
  user_metadata: Record<string, unknown>;
};

/**
 * Usuário logado, lido do token da sessão. O token (ES256) é verificado
 * localmente com a chave pública do projeto, sem ida ao servidor de Auth, e o
 * resultado vale para toda a requisição (React cache): as várias consultas de
 * uma página não repetem a verificação.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
  };
});
