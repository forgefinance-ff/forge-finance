import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ConnectWhatsappButton } from "@/components/whatsapp/connect-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findOnboardingToken, maskPhone } from "@/lib/whatsapp/onboarding";

export const dynamic = "force-dynamic";

export const metadata = { title: "Conectar WhatsApp · Forge Finance" };

const linkButton =
  "forge-auth-button flex items-center justify-center text-center no-underline";

export default async function ConnectWhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t = "" } = await searchParams;
  const found = await findOnboardingToken(createAdminClient(), t);

  if (!found) {
    return (
      <AuthShell subtitle="Conectar WhatsApp">
        <div className="forge-auth-card space-y-4 rounded-2xl p-6 text-center sm:p-8">
          <h1 className="text-lg font-semibold text-white">Link expirado ou já usado</h1>
          <p className="text-sm text-zinc-400">
            Mande qualquer mensagem para o Forge Finance no WhatsApp e você recebe um link novo
            na hora.
          </p>
          <Link href="/login" className="text-sm font-medium text-violet-300 hover:text-violet-200">
            Ir para o login
          </Link>
        </div>
      </AuthShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = `/conectar-whatsapp?t=${encodeURIComponent(found.token)}`;
  const phone = maskPhone(found.phone);

  if (!user) {
    return (
      <AuthShell subtitle="Falta pouco para usar o Forge Finance no WhatsApp.">
        <div className="forge-auth-card space-y-5 rounded-2xl p-6 sm:p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-lg font-semibold text-white">Conectar o WhatsApp {phone}</h1>
            <p className="text-sm text-zinc-400">
              Crie sua conta (leva 1 minuto) ou entre, se já tiver uma. Depois é só confirmar e
              o número fica conectado.
            </p>
          </div>

          <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className={linkButton}>
            Criar minha conta
          </Link>

          <p className="text-center text-sm text-zinc-400">
            Já tem conta?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-medium text-violet-300 transition hover:text-violet-200"
            >
              Entrar
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Último passo: confirme a conexão.">
      <div className="forge-auth-card space-y-5 rounded-2xl p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-semibold text-white">Conectar o WhatsApp {phone}</h1>
          <p className="text-sm text-zinc-400">
            Conectado como <span className="text-zinc-200">{user.email}</span>. Depois disso você
            registra gastos, receitas e consultas mandando texto ou áudio, e sempre confirma antes
            de salvar.
          </p>
        </div>

        <ConnectWhatsappButton token={found.token} />

        <p className="text-center text-xs text-zinc-500">
          Não é você?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-violet-300 hover:text-violet-200"
          >
            Entrar com outra conta
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
