import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

const DEFAULT_NEXT_PATH = "/dashboard";

// Aceita apenas caminhos internos, para o link não virar um redirecionamento aberto.
function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return DEFAULT_NEXT_PATH;
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeNextPath(searchParams.get("next"));

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    // O Supabase confirma o e-mail antes de chegar aqui. Sem o verificador PKCE
    // (link aberto em outro navegador/aparelho) não há sessão, então basta entrar.
    if (error.code === "pkce_code_verifier_not_found") {
      return NextResponse.redirect(new URL("/login?confirmado=1", origin));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/login?erro=link-invalido", origin));
}
