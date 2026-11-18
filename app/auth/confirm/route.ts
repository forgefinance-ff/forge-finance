import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/safe-next";

/**
 * Destino dos links de e-mail do Supabase e do login com Google (fluxo PKCE).
 * Troca o código do link por uma sessão e segue para `next`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next")) ?? "/";
  const code = url.searchParams.get("code");

  const response = NextResponse.redirect(new URL(next, url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    }
  );

  // Só o fluxo PKCE (code): ele exige o cookie verificador do navegador que
  // pediu o link. O antigo ramo token_hash aceitava qualquer token vindo na
  // URL e permitia logar a vítima na conta de outra pessoa (login CSRF); o
  // app não gera mais esse tipo de link.
  const ok = code ? !(await supabase.auth.exchangeCodeForSession(code)).error : false;

  if (!ok) {
    const fail = next.startsWith("/redefinir-senha") ? "/redefinir-senha" : "/login";
    return NextResponse.redirect(new URL(`${fail}?link=invalido`, url.origin));
  }

  return response;
}
