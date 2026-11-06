import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Lock,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUpIcon,
  Undo2,
} from "lucide-react";

import { billingEnabled } from "@/lib/billing/config";
import { PLAN_CATALOG, PRO_PRICING } from "@/lib/billing/plans";

import { AutoChat, Bubble, type ChatMessage } from "./chat";
import { DayTimeline } from "./day-timeline";
import { Pricing } from "./pricing";
import { TryIt } from "./try-it";

const HERO_SCRIPT: ChatMessage[] = [
  { from: "user", text: "gastei 62 na farmácia", time: "09:12" },
  { from: "bot", text: "Registrado! ✍️\n🔴 Farmácia — *R$ 62,00* • Saúde\nEsse mês em Saúde: *R$ 214,00*", buttons: ["↩️ Desfazer"], time: "09:12" },
  { from: "user", text: "uber 23,90", time: "12:47" },
  { from: "bot", text: "Registrado! ✍️\n🔴 Uber — *R$ 23,90* • Transporte", buttons: ["↩️ Desfazer"], time: "12:47" },
  { from: "user", text: "quanto sobrou esse mês?", time: "20:05" },
  { from: "bot", text: "Sobraram *R$ 1.330* até agora, e faltam 12 dias para o mês acabar. 💜", time: "20:05" },
];

const TRUST = [
  { icon: MessageCircle, title: "API oficial do WhatsApp", text: "Meta Business Platform" },
  { icon: ShieldCheck, title: "Pagamento seguro", text: "Processado pelo Stripe" },
  { icon: Lock, title: "Seus dados protegidos", text: "Conforme a LGPD" },
  { icon: RotateCcw, title: "Sem fidelidade", text: "Cancele quando quiser" },
];

const FEATURES: {
  icon: typeof Tags;
  title: string;
  text: string;
  chat: [ChatMessage, ChatMessage];
}[] = [
  {
    icon: Tags,
    title: "Cada gasto já entra na categoria certa.",
    text: "Você escreve do seu jeito. O Forge entende valor, categoria, conta e data, e lança no app na hora.",
    chat: [
      { from: "user", text: "pizza 74 sexta no Nubank" },
      { from: "bot", text: "Registrado! ✍️\n🔴 Pizza — *R$ 74,00*\nDelivery • Nubank • sexta", buttons: ["↩️ Desfazer"] },
    ],
  },
  {
    icon: TrendingUpIcon,
    title: "Pergunte qualquer coisa sobre o seu dinheiro.",
    text: "Saldo, gastos por categoria, o que vence na semana. A resposta vem com os seus números de verdade.",
    chat: [
      { from: "user", text: "quanto gastei com delivery esse mês?" },
      {
        from: "bot",
        text: "*R$ 612,00* em Delivery, 34% dos seus gastos.",
        bars: [
          { label: "Delivery", value: 100, display: "R$ 612" },
          { label: "Mês passado", value: 74, display: "R$ 455" },
        ],
      },
    ],
  },
  {
    icon: Undo2,
    title: "Errou? Desfaz com um toque.",
    text: "Lançamentos claros são gravados direto. Se algo saiu errado, um toque em Desfazer resolve. Exclusões e mudanças sempre pedem confirmação.",
    chat: [
      { from: "user", text: "gasolina 200" },
      { from: "bot", text: "Registrado! ✍️\n🔴 Gasolina — *R$ 200,00* • Transporte", buttons: ["↩️ Desfazer"] },
    ],
  },
  {
    icon: Building2,
    title: "Pessoal e Empresa (MEI) no mesmo lugar.",
    text: "Contas a pagar e receber, clientes e impostos do MEI separados das suas finanças pessoais, sem misturar nada.",
    chat: [
      { from: "user", text: "como está meu faturamento do MEI?" },
      { from: "bot", text: "🏢 Faturamento em 2026: *R$ 38.400*\nVocê está em 47% do limite que configurou." },
    ],
  },
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
    <div className="min-h-screen bg-[#09080f] text-white antialiased">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-50 px-3 pt-3">
        <nav className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/10 bg-[#09080f]/80 py-2 pl-4 pr-2 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon-f.png" alt="" width={28} height={28} className="h-7 w-7" priority />
            <span className="text-[15px] font-semibold tracking-tight">Forge Finance</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-sm text-white/70 hover:text-white sm:block">
              Entrar
            </Link>
            <Link
              href={ctaHref}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Começar agora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      {/* Herói */}
      <section className="relative overflow-hidden px-5 pb-16 pt-14 sm:pt-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" /> Controle financeiro pelo WhatsApp
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              Sua vida financeira organizada numa conversa.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/60 lg:mx-0">
              Mande um áudio ou uma mensagem com o gasto. O Forge registra, categoriza e responde quanto sobrou, sem planilha e sem
              abrir app nenhum.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href={ctaHref}
                className="flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 text-[15px] font-semibold shadow-lg shadow-violet-600/30 hover:brightness-110"
              >
                Quero organizar meu dinheiro <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="#como-funciona" className="text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
                Ver como funciona
              </Link>
            </div>
          </div>
          <AutoChat script={HERO_SCRIPT} />
        </div>
      </section>

      {/* Selos */}
      <section className="border-y border-white/[0.06] bg-white/[0.02] px-5 py-6">
        <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-5 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-violet-300" />
              <div className="leading-tight">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-white/50">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Teste agora (claro) */}
      <section id="como-funciona" className="scroll-mt-24 bg-[#f6f5fa] px-5 py-20 text-[#14111f]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-700">Teste agora</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Toque num pedido e veja o Forge resolver.</h2>
            <p className="mx-auto mt-4 max-w-lg leading-7 text-[#5b5575] lg:mx-0">
              É exatamente assim no seu WhatsApp. Sem menus, sem formulários: você fala do seu jeito e o Forge entende.
            </p>
            <p className="mt-3 text-xs text-[#8a84a3]">Simulação com dados de exemplo.</p>
          </div>
          <TryIt />
        </div>
      </section>

      {/* Benefícios (escuro) */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo o que um app de finanças faz, só que por mensagem.
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text, chat }) => (
              <article key={title} className="flex flex-col rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6">
                <Icon className="h-6 w-6 text-violet-300" />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/60">{text}</p>
                <div className="mt-6 space-y-2 rounded-2xl bg-[#0b0a12] p-3">
                  <Bubble message={chat[0]} />
                  <Bubble message={chat[1]} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Painel (claro) */}
      <section className="bg-[#f6f5fa] px-5 py-20 text-[#14111f]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tudo o que você manda pelo WhatsApp fica organizado no painel.
            </h2>
            <p className="mx-auto mt-4 max-w-lg leading-7 text-[#5b5575] lg:mx-0">
              Saldo, gastos por categoria, metas, orçamento do mês e relatórios por período, no celular ou no computador.
            </p>
          </div>
          <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a84a3]">Saldo do mês · exemplo</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">
              R$ 1.330<span className="text-xl text-[#8a84a3]">,00</span>
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">+18% em relação ao mês passado</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#f6f5fa] p-3">
                <p className="text-xs text-[#8a84a3]">Entradas</p>
                <p className="font-semibold">R$ 5.200,00</p>
              </div>
              <div className="rounded-2xl bg-[#f6f5fa] p-3">
                <p className="text-xs text-[#8a84a3]">Saídas</p>
                <p className="font-semibold">R$ 3.870,00</p>
              </div>
            </div>
            <p className="mt-5 text-sm font-semibold">Gastos por categoria</p>
            <div className="mt-3 space-y-3">
              {[
                ["Delivery", 100, "R$ 612"],
                ["Mercado", 88, "R$ 540"],
                ["Transporte", 51, "R$ 310"],
                ["Assinaturas", 31, "R$ 189"],
              ].map(([label, value, display]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-xs text-[#5b5575]">
                    <span>{label}</span>
                    <span className="font-medium text-[#14111f]">{display}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[#efedf6]">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Um dia com o Forge (escuro) */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Um dia normal. Só que com o dinheiro sob controle.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center leading-7 text-white/60">
            Cinco momentos de um dia comum e o que o Forge resolve em cada um, direto no WhatsApp.
          </p>
          <div className="mt-12">
            <DayTimeline />
          </div>
        </div>
      </section>

      {/* Planos (claro) */}
      <section id="planos" className="scroll-mt-24 bg-[#f6f5fa] px-5 py-20 text-[#14111f]">
        <div className="mx-auto max-w-6xl">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Organize seu dinheiro por menos de um café por semana.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center leading-7 text-[#5b5575]">
            Sem fidelidade, sem multa e sem limite para o uso do dia a dia.
          </p>
          <div className="mt-10">
            <Pricing
              billingOn={billingOn}
              monthlyCents={PRO_PRICING.month.cents}
              yearlyCents={PRO_PRICING.year.cents}
              features={pro.features}
            />
          </div>
          <p className="mt-6 text-center text-sm text-[#5b5575]">
            Prefere começar pelo básico?{" "}
            <Link href="/cadastro" className="font-medium text-violet-700 underline-offset-4 hover:underline">
              Crie sua conta grátis
            </Link>
          </p>
        </div>
      </section>

      {/* Perguntas (claro) */}
      <section className="bg-[#f6f5fa] px-5 pb-20 text-[#14111f]">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Perguntas frequentes.</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-black/[0.06] bg-white px-5 py-4 open:shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f6f5fa] text-[#5b5575] transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-[#5b5575]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="relative overflow-hidden px-5 py-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[110px]" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Seu próximo gasto já pode ser só uma mensagem.</h2>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-7 font-semibold shadow-lg shadow-violet-600/30 hover:brightness-110"
          >
            Começar agora <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="border-t border-white/[0.06] px-5 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <Image src="/icon-f.png" alt="" width={24} height={24} className="h-6 w-6" />
              <span className="font-semibold">Forge Finance</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/50">
              Controle financeiro pessoal e para MEI, direto no WhatsApp. Controle. Planeje. Conquiste.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Produto</p>
              <Link href="#como-funciona" className="block text-white/70 hover:text-white">
                Como funciona
              </Link>
              <Link href="#planos" className="block text-white/70 hover:text-white">
                Planos
              </Link>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Conta</p>
              <Link href="/login" className="block text-white/70 hover:text-white">
                Entrar
              </Link>
              <Link href="/cadastro" className="block text-white/70 hover:text-white">
                Criar conta
              </Link>
              <Link href="/privacidade" className="block text-white/70 hover:text-white">
                Privacidade
              </Link>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs text-white/40">© {new Date().getFullYear()} Forge Finance. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
