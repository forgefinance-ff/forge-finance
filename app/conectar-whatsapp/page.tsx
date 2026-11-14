import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ConnectWhatsappButton } from "@/components/whatsapp/connect-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthUser } from "@/lib/supabase/server";
import { findOnboardingToken, maskPhone } from "@/lib/whatsapp/onboarding";

export const dynamic = "force-dynamic";

export const metadata = { title: "Conectar WhatsApp · Forge Finance" };

const linkButton = "forge-auth-button";

export default async function ConnectWhatsappPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t = "" } = await searchParams;
  const found = await findOnboardingToken(createAdminClient(), t);

  if (!found) {
    return (
      <AuthShell
        title="Link expirado ou já usado."
        subtitle={<>Mande qualquer mensagem para o <span className="brand-name">Forge Finance</span> no WhatsApp e você recebe um link novo na hora.</>}
      >
        <Link href="/login" className={linkButton}>
          Ir para o login
        </Link>
      </AuthShell>
    );
  }

  const user = await getAuthUser();

  const next = `/conectar-whatsapp?t=${encodeURIComponent(found.token)}`;
  const phone = maskPhone(found.phone);

  if (!user) {
    return (
      <AuthShell
        title={`Conectar o WhatsApp ${phone}`}
        subtitle="Crie sua conta (leva 1 minuto) ou entre, se já tiver uma. Depois é só confirmar e o número fica conectado."
      >
        <div className="space-y-5">

          <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className={linkButton}>
            Criar minha conta
          </Link>

          <p className="forge-auth-note text-center">
            Já tem conta?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="forge-auth-link">
              Entrar
            </Link>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={`Conectar o WhatsApp ${phone}`}
      subtitle="Último passo: confirme a conexão. Depois você registra gastos, receitas e consultas mandando texto ou áudio, e sempre confirma antes de salvar."
    >
      <div className="space-y-5">
        <p className="forge-auth-note">
          Conectado como <strong className="font-medium text-[oklch(17%_0.02_300)]">{user.email}</strong>
        </p>

        <ConnectWhatsappButton token={found.token} />

        <p className="forge-auth-note text-center">
          Não é você?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="forge-auth-link">
            Entrar com outra conta
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
