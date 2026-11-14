import Image from "next/image";
import Link from "next/link";
import { CheckIcon, LockIcon, MessageCircleIcon } from "lucide-react";

import "./auth.css";

type AuthShellProps = {
  title: string;
  subtitle: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Moldura das telas de login/cadastro: formulário à esquerda e, no computador,
 * um painel lilás à direita com uma prévia da conversa no WhatsApp.
 * Sempre clara, no mesmo tema da landing.
 */
export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="forge-auth">
      <div className="forge-auth-main">
        <Link href="/" className="forge-auth-brand self-start">
          <Image src="/icon-f.png" alt="" width={28} height={28} className="h-7 w-7" priority />
          <span className="brand-wordmark">forge finance</span>
        </Link>

        <div className="forge-auth-body">
          <h1 className="forge-auth-title">{title}</h1>
          <p className="forge-auth-sub">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>

        <p className="forge-auth-foot flex items-center gap-1.5">
          <LockIcon className="h-3.5 w-3.5" aria-hidden />
          Conexão segura. Seus dados ficam só com você.
        </p>
      </div>

      <aside className="forge-auth-aside" aria-hidden>
        <p className="forge-auth-aside__quote">Seu dinheiro organizado numa conversa.</p>

        <div className="forge-auth-phone">
          <div className="forge-auth-phone__head">
            <Image src="/icon-f.png" alt="" width={32} height={32} className="h-8 w-8" />
            <div>
              <span className="brand-wordmark">forge finance</span>
              <small>online</small>
            </div>
          </div>
          <div className="forge-auth-bubbles">
            <p className="forge-auth-bubble forge-auth-bubble--me">gastei 42 no mercado</p>
            <p className="forge-auth-bubble forge-auth-bubble--bot">
              Anotado: <strong>R$ 42,00</strong> em Mercado. Ainda cabem <strong>R$ 318,00</strong> no
              orçamento do mês.
            </p>
            <p className="forge-auth-bubble forge-auth-bubble--me">quanto sobrou esse mês?</p>
            <p className="forge-auth-bubble forge-auth-bubble--bot">
              Sobraram <strong>R$ 1.240,00</strong>, 18% do que entrou. Melhor que o mês passado.
            </p>
          </div>
        </div>

        <div className="forge-auth-points">
          <span>
            <MessageCircleIcon className="h-3.5 w-3.5" /> Registre por mensagem ou áudio
          </span>
          <span>
            <CheckIcon className="h-3.5 w-3.5" /> Pessoal e MEI no mesmo lugar
          </span>
        </div>
      </aside>
    </main>
  );
}
