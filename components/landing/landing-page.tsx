import { LearnChevron, PopNumber, Reveal, StaggerReveal } from "@/components/motion";
import { FaqList } from "./faq";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CalendarRange,
  Lock,
  MessageCircle,
  MessageSquare,
  Mic,
  PiggyBank,
  RotateCcw,
  ShieldCheck,
  Tags,
  Target,
} from "lucide-react";

import { billingEnabled } from "@/lib/billing/config";
import { PLAN_CATALOG, PRO_PRICING } from "@/lib/billing/plans";

import { DayTimeline } from "./day-timeline";
import FoldText from "./fold-text";
import { Pricing } from "./pricing";
import { TryIt } from "./try-it";

import "./landing.css";


const TRUST = [
  { icon: MessageCircle, title: "API oficial do WhatsApp", text: "Meta Business Platform" },
  { icon: ShieldCheck, title: "Pagamento seguro", text: "Processado pelo Stripe" },
  { icon: Lock, title: "Seus dados protegidos", text: "Conforme a LGPD" },
  { icon: RotateCcw, title: "Sem fidelidade", text: "Cancele quando quiser" },
];

const PANEL_TAGS = [
  { icon: PiggyBank, label: "Saldo" },
  { icon: Tags, label: "Gastos por categoria" },
  { icon: Target, label: "Metas" },
  { icon: CalendarRange, label: "Orçamento do mês" },
  { icon: BarChart3, label: "Relatórios por período" },
];

const CATEGORIES: [string, number, string][] = [
  ["Delivery", 100, "R$ 612"],
  ["Mercado", 88, "R$ 540"],
  ["Transporte", 51, "R$ 310"],
  ["Assinaturas", 31, "R$ 189"],
];

const FAQ = [
  {
    q: "O que acontece depois que eu assino?",
    a: "Seu Forge Pro é liberado na hora. Você conecta o seu WhatsApp pela página WhatsApp do app (leva menos de um minuto) e já pode mandar o primeiro gasto.",
  },
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. Você registra tudo pelo WhatsApp que já usa, e consulta painéis e relatórios pelo navegador, no celular ou no computador.",
  },
  {
    q: "Como eu registro um gasto?",
    a: "Do jeito que você falaria: \"gastei 45 no mercado\", \"uber 23,90\", ou um áudio. O Forge entende, categoriza e lança. Se algo estiver errado, é só tocar em Desfazer.",
  },
  {
    q: "Preciso conectar meu banco?",
    a: "Não. Você registra pelo WhatsApp e, se quiser, importa o extrato do banco no app. Nenhuma senha de banco é pedida.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Conexão criptografada, cada usuário só acessa os próprios dados, e o WhatsApp funciona pela API oficial da Meta. Os dados do cartão vão direto para o Stripe e nunca passam pelo Forge.",
  },
  {
    q: "Serve para MEI?",
    a: "Serve. Você separa Pessoal e Empresa, controla contas a pagar e receber, clientes e o DAS, tudo no mesmo app e no mesmo WhatsApp.",
  },
  {
    q: "Tem limite de mensagens?",
    a: "Não para o uso normal do dia a dia. Para proteger o serviço, existe só um limite por hora contra envios automáticos em massa.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Pode. Sem multa e sem fidelidade. Você mantém o Forge Pro até o fim do período pago e seus dados continuam no plano gratuito. Desistindo em até 7 dias, devolvemos o valor.",
  },
];

export function LandingPage() {
  const billingOn = billingEnabled();
  const pro = PLAN_CATALOG.find((plan) => plan.id === "pro")!;
  const ctaHref = "#planos";

  return (
    <div className="uv min-h-screen">
      {/* Barra flutuante */}
      <header className="uv-nav">
        <div className="uv-wrap">
          <nav className="uv-nav__pill" aria-label="Principal">
            <Link href="/" className="uv-wordmark">
              <Image src="/icon-f.png" alt="" width={28} height={28} className="h-7 w-7" priority />
              Forge Finance
            </Link>
            <div className="uv-nav__links">
              <Link href="#como-funciona" className="uv-link uv-link--muted">Como funciona</Link>
              <Link href="#um-dia" className="uv-link uv-link--muted">Um dia</Link>
              <Link href="#planos" className="uv-link uv-link--muted">Planos</Link>
              <Link href="#perguntas" className="uv-link uv-link--muted">Perguntas</Link>
            </div>
            <div className="uv-nav__end">
              <Link href="/login" className="uv-link hidden sm:inline">Entrar</Link>
              <Link href={ctaHref} className="uv-btn uv-btn--primary uv-btn--sm">Começar agora</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Herói centrado */}
        <section className="uv-hero uv-center">
          <StaggerReveal className="uv-wrap">
            <h1 className="t-stagger-line">Sua vida financeira organizada numa conversa.</h1>
            <p className="uv-lead t-stagger-line t-stagger-line--2">Mande o gasto por mensagem ou áudio. O Forge registra e responde.</p>
            <div className="uv-hero__actions t-stagger-line t-stagger-line--3">
              <Link href={ctaHref} className="uv-btn uv-btn--primary t-learn">Quero organizar meu dinheiro <LearnChevron /></Link>
              <Link href="#como-funciona" className="uv-btn uv-btn--ghost t-learn">Ver como funciona <LearnChevron /></Link>
            </div>
          </StaggerReveal>
        </section>

        {/* Palco: a demonstração em forma de mensagem */}
        <section id="como-funciona" className="scroll-mt-24" aria-label="Teste o Forge">
          <div className="uv-wrap">
            <Reveal className="uv-stage">
              <TryIt />
            </Reveal>
            <p className="uv-ways">
              Mande do seu jeito:
              <span><MessageSquare aria-hidden /> Texto</span>
              <span><Mic aria-hidden /> Áudio</span>
              <span className="text-[var(--uv-muted)]">Sem planilha e sem abrir app nenhum.</span>
            </p>
          </div>

          {/* Selos em carrossel */}
          <div className="uv-marquee" aria-label="Garantias">
            <div className="uv-marquee__track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="uv-marquee__list" aria-hidden={copy === 1 ? true : undefined}>
                  {TRUST.map(({ icon: Icon, title, text }) => (
                    <li key={title}>
                      <Icon className="h-5 w-5" aria-hidden />
                      <div className="leading-tight">
                        <p className="text-[15px] font-medium">{title}</p>
                        <p className="uv-note mt-1">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        </section>

        {/* Um dia com o Forge */}
        <section id="um-dia" className="uv-section scroll-mt-24">
          <div className="uv-wrap">
            <StaggerReveal onView>
              <h2 className="t-stagger-line max-w-[16ch]">Um dia normal. Só que com o dinheiro sob controle.</h2>
              <p className="uv-lead t-stagger-line t-stagger-line--2 mt-5 max-w-[46ch]">
                Cinco momentos de um dia comum e o que o Forge resolve em cada um, direto no WhatsApp.
              </p>
            </StaggerReveal>
            <Reveal>
              <DayTimeline />
            </Reveal>
          </div>
        </section>

        {/* O painel: painel grande de um lado, texto e etiquetas do outro */}
        <section className="uv-section pt-0">
          <div className="uv-wrap uv-row">
            <Reveal className="uv-panel">
              <div className="uv-sheet uv-ledger">
                <div>
                  <p className="uv-label">Saldo do mês, exemplo</p>
                  <p className="uv-figure mt-3 text-[clamp(2.5rem,4.2vw,3.75rem)]">
                    <PopNumber value="R$ 1.330" startDelay={200} />
                    <span className="text-[0.5em] text-[var(--uv-muted)]">,00</span>
                  </p>
                  <p className="uv-note mt-3">+18% em relação ao mês passado</p>
                </div>
                <div className="uv-ledger__pair">
                  <div>
                    <p className="uv-label">Entradas</p>
                    <p className="uv-figure mt-2 text-[clamp(1.25rem,1.9vw,1.625rem)]"><PopNumber value="R$ 5.200,00" startDelay={420} /></p>
                  </div>
                  <div>
                    <p className="uv-label">Saídas</p>
                    <p className="uv-figure mt-2 text-[clamp(1.25rem,1.9vw,1.625rem)]"><PopNumber value="R$ 3.870,00" startDelay={560} /></p>
                  </div>
                </div>
                <div>
                  <p className="uv-label mb-1">Gastos por categoria</p>
                  {CATEGORIES.map(([label, value, display], index) => (
                    <div key={label} className="uv-ledger__row t-reveal-item" style={{ "--i": index + 3 } as React.CSSProperties}>
                      <span>{label}</span>
                      <span className="uv-ledger__bar"><i className="t-bar-grow" style={{ width: `${value}%` }} /></span>
                      <span className="uv-num text-right">{display}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <StaggerReveal onView className="uv-copy">
              <h2 className="t-stagger-line">Tudo o que você manda pelo WhatsApp fica organizado no painel.</h2>
              <p className="uv-lead t-stagger-line t-stagger-line--2 max-w-[42ch]">
                Saldo, gastos por categoria, metas, orçamento do mês e relatórios por período, no celular ou no computador.
              </p>
              <Link href={ctaHref} className="uv-link t-stagger-line t-stagger-line--3">Quero organizar meu dinheiro</Link>
              <div className="uv-tags t-stagger-line t-stagger-line--4">
                {PANEL_TAGS.map(({ icon: Icon, label }) => (
                  <span key={label} className="uv-tag"><Icon aria-hidden />{label}</span>
                ))}
              </div>
              <p className="uv-safe uv-note t-stagger-line t-stagger-line--4">
                <Lock aria-hidden />
                Você registra pelo WhatsApp e, se quiser, importa o extrato no app. Nenhuma senha de banco é pedida.
              </p>
            </StaggerReveal>
          </div>
        </section>

        {/* Planos: texto de um lado, o plano sobre o palco do outro */}
        <section id="planos" className="uv-section pt-0 scroll-mt-24">
          <div className="uv-wrap uv-row uv-row--flip">
            <Reveal className="uv-panel uv-panel--stage">
              <Pricing
                billingOn={billingOn}
                monthlyCents={PRO_PRICING.month.cents}
                yearlyCents={PRO_PRICING.year.cents}
                features={pro.features}
              />
            </Reveal>
            <StaggerReveal onView className="uv-copy">
              <h2 className="t-stagger-line">Organize seu dinheiro por menos de um café por semana.</h2>
              <p className="uv-lead t-stagger-line t-stagger-line--2 max-w-[40ch]">Sem fidelidade, sem multa e sem limite para o uso do dia a dia.</p>
              <p className="uv-body t-stagger-line t-stagger-line--3">
                Prefere começar pelo básico?{" "}
                <Link href="/cadastro" className="uv-link--prose">Crie sua conta grátis</Link>
              </p>
            </StaggerReveal>
          </div>
        </section>

        {/* Perguntas */}
        <section id="perguntas" className="uv-section pt-0 scroll-mt-24">
          <div className="uv-wrap uv-faq">
            <StaggerReveal onView>
              <h2 className="t-stagger-line">Perguntas frequentes.</h2>
            </StaggerReveal>
            <Reveal>
              <FaqList items={FAQ} />
            </Reveal>
          </div>
        </section>

        {/* Chamada final */}
        <section className="uv-section pt-0 uv-center">
          <StaggerReveal onView className="uv-wrap">
            <h2 className="t-stagger-line mx-auto max-w-[16ch]">Seu próximo gasto já pode ser só uma mensagem.</h2>
            <div className="uv-hero__actions t-stagger-line t-stagger-line--2">
              <Link href={ctaHref} className="uv-btn uv-btn--primary t-learn">Começar agora <LearnChevron /></Link>
            </div>
          </StaggerReveal>
        </section>
      </main>

      {/* Rodapé mast */}
      <footer className="uv-mast">
        <div className="uv-wrap">
          <span className="uv-mast__word" aria-hidden>
            <FoldText
              text="forge finance"
              foldStyle="paper"
              splitBy="char"
              hinge="top"
              trigger="scroll"
              foldAngle={92}
              duration={0.65}
              stagger={0.045}
              staggerFrom="start"
              ease="power3.out"
              hoverRefold
              refoldRadius={140}
              refoldAngle={45}
              perspective={700}
              creaseShading={0.55}
              fontSize="1em"
              fontWeight={400}
            />
          </span>
          <div className="uv-mast__row">
            <p className="uv-body max-w-sm text-[15px]">
              Controle financeiro pessoal e para MEI, direto no WhatsApp. Controle. Planeje. Conquiste.
            </p>
            <nav className="uv-mast__links" aria-label="Rodapé">
              <Link href="#como-funciona" className="uv-link uv-link--muted">Como funciona</Link>
              <Link href="#planos" className="uv-link uv-link--muted">Planos</Link>
              <Link href="/login" className="uv-link uv-link--muted">Entrar</Link>
              <Link href="/cadastro" className="uv-link uv-link--muted">Criar conta</Link>
              <Link href="/privacidade" className="uv-link uv-link--muted">Privacidade</Link>
            </nav>
          </div>
          <p className="uv-note mt-8">© {new Date().getFullYear()} Forge Finance. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
