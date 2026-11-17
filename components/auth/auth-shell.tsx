import Image from "next/image";
import Link from "next/link";
import { BriefcaseIcon, LockIcon, MessageCircleIcon, SparklesIcon } from "lucide-react";

import { HighlightCard, SignInLayout } from "@/components/ui/sign-in";

import "./auth.css";

type AuthShellProps = {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Moldura das telas de entrada (login, cadastro, senha): formulário à esquerda
 * e, no computador, um painel roxo com a prévia da conversa no WhatsApp e
 * cartões com o que o Forge faz. Sempre clara, no mesmo tema da landing.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="forge-auth">
      <SignInLayout
        brand={
          <Link href="/" className="forge-auth-brand">
            <Image src="/icon-f.png" alt="" width={28} height={28} className="h-7 w-7" priority />
            <span className="brand-wordmark">forge finance</span>
          </Link>
        }
        title={title}
        description={subtitle}
        footer={
          <p className="forge-auth-foot flex items-center gap-1.5">
            <LockIcon className="h-3.5 w-3.5" aria-hidden />
            Conexão segura. Seus dados ficam só com você.
          </p>
        }
        hero={
          <div className="flex h-full flex-col items-center justify-center gap-8 p-10 pb-44" aria-hidden>
            <p className="auth-hero-quote">O financeiro do seu MEI, direto no WhatsApp.</p>
            <div className="forge-auth-phone">
              <div className="forge-auth-phone__head">
                <Image src="/icon-f.png" alt="" width={32} height={32} className="h-8 w-8" />
                <div>
                  <span className="brand-wordmark">forge finance</span>
                  <small>online</small>
                </div>
              </div>
              <div className="forge-auth-bubbles">
                <p className="forge-auth-bubble forge-auth-bubble--me">recebi 250 da cliente Ana</p>
                <p className="forge-auth-bubble forge-auth-bubble--bot">
                  Anotado: <strong>R$ 250,00</strong> de entrada na <strong>Empresa</strong>.
                </p>
                <p className="forge-auth-bubble forge-auth-bubble--me">quanto sobrou esse mês?</p>
                <p className="forge-auth-bubble forge-auth-bubble--bot">
                  Sobraram <strong>R$ 1.240,00</strong>, 18% do que entrou.
                </p>
              </div>
            </div>
          </div>
        }
        highlights={
          <>
            <HighlightCard
              delay="animate-delay-1000"
              icon={<MessageCircleIcon className="h-5 w-5" />}
              title="Por mensagem ou áudio"
              text="Mande o gasto no WhatsApp e ele já cai na categoria certa."
            />
            <div className="hidden xl:flex">
              <HighlightCard
                delay="animate-delay-1200"
                icon={<BriefcaseIcon className="h-5 w-5" />}
                title="Pessoal e empresa"
                text="Seu dinheiro e o do MEI separados, no mesmo lugar."
              />
            </div>
            <div className="hidden 2xl:flex">
              <HighlightCard
                delay="animate-delay-1400"
                icon={<SparklesIcon className="h-5 w-5" />}
                title="Resumo todo mês"
                text="No último dia: quanto entrou, saiu e sobrou."
              />
            </div>
          </>
        }
      >
        <div className="animate-element animate-delay-300">{children}</div>
      </SignInLayout>
    </main>
  );
}
