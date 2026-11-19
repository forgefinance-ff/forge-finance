import Link from "next/link";
import { Check, Lock, MessageCircle, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";

import { billingEnabled } from "@/lib/billing/config";
import { getUserEntitlement, isOnTrial, isPaidActive } from "@/lib/billing/get-user-plan";
import { trialDaysLeft } from "@/lib/billing/manual-access";
import {
  PLAN_CATALOG,
  PLAN_PRICING,
  formatBRL,
  isPaidPlan,
  planSlug,
  yearlyComparison,
  type PaidPlanId,
  type PlanDefinition,
} from "@/lib/billing/plans";

const NOTICES: Record<string, { tone: "info" | "error"; text: string }> = {
  cancelado: { tone: "info", text: "Pagamento não concluído. Nada foi cobrado." },
  erro: { tone: "error", text: "Não conseguimos abrir o pagamento agora. Tente de novo em instantes." },
  "em-breve": { tone: "info", text: "As assinaturas abrem em breve. Por enquanto, tudo segue liberado sem custo." },
};

const TRUST = [
  { icon: ShieldCheck, text: "Pagamento seguro via Stripe" },
  { icon: MessageCircle, text: "WhatsApp pela API oficial da Meta" },
  { icon: Lock, text: "Seus dados protegidos (LGPD)" },
  { icon: RotateCcw, text: "7 dias para desistir" },
];

const FAQ = [
  {
    q: "Qual a diferença entre o Forge Pessoal e o Forge MEI?",
    a: "O Forge Pessoal cuida das suas finanças pessoais. O Forge MEI tem tudo do Pessoal e soma o modo Empresa: clientes, contas a pagar e a receber, DAS e limite do MEI.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Sem multa e sem fidelidade. Você cancela em Plano e assinatura e mantém o plano até o fim do período já pago.",
  },
  {
    q: "Como funciona a garantia de 7 dias?",
    a: "Se desistir em até 7 dias depois da assinatura, devolvemos o valor pago. É só pedir pelo nosso WhatsApp ou e-mail de suporte.",
  },
  {
    q: "Quais formas de pagamento?",
    a: "Cartão de crédito, pelo checkout seguro do Stripe. A renovação é automática, e você recebe o recibo por e-mail.",
  },
  {
    q: "E se eu cancelar, perco meus dados?",
    a: "Não. Sua conta volta para o Forge Free e todos os seus lançamentos, metas e relatórios continuam no app.",
  },
];

function PlanFeatures({ plan }: { plan: PlanDefinition }) {
  return (
    <ul className="mt-5 flex-1 space-y-3">
      {plan.features.map((feature) => (
        <li key={feature} className="flex gap-2 text-sm text-text-soft">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />
          {feature}
        </li>
      ))}
      {plan.missing.map((feature) => (
        <li key={feature} className="flex gap-2 text-sm text-faint line-through">
          <X className="mt-0.5 h-4 w-4 shrink-0" />
          {feature}
        </li>
      ))}
    </ul>
  );
}

function SubscribeOptions({ plan, enabled }: { plan: PaidPlanId; enabled: boolean }) {
  const { perMonth, savings } = yearlyComparison(plan);
  const pricing = PLAN_PRICING[plan];
  const tipo = planSlug(plan);

  return (
    <div className="mt-6 grid grid-cols-1 gap-3">
      <form action="/assinar" method="get" className="flex flex-col rounded-xl border-2 border-violet-500 bg-violet-500/10 p-4">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="plano" value="anual" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Anual</p>
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-success">2 meses grátis</span>
        </div>
        <p className="mt-2 text-2xl font-bold text-foreground">
          {formatBRL(perMonth)}
          <span className="text-sm font-normal text-muted-foreground">/mês</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {formatBRL(pricing.year.cents)} por ano · economize {formatBRL(savings)}
        </p>
        <button
          type="submit"
          disabled={!enabled}
          className="mt-4 h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enabled ? "Assinar anual" : "Disponível em breve"}
        </button>
      </form>

      <form action="/assinar" method="get" className="flex flex-col rounded-xl border border-line bg-surface p-4">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="plano" value="mensal" />
        <p className="text-sm font-semibold text-foreground">Mensal</p>
        <p className="mt-2 text-2xl font-bold text-foreground">
          {formatBRL(pricing.month.cents)}
          <span className="text-sm font-normal text-muted-foreground">/mês</span>
        </p>
        <p className="text-xs text-muted-foreground">Cancele quando quiser</p>
        <button
          type="submit"
          disabled={!enabled}
          className="mt-4 h-11 rounded-xl border border-violet-400/40 px-4 text-sm font-semibold text-brand-soft transition hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enabled ? "Assinar mensal" : "Disponível em breve"}
        </button>
      </form>
    </div>
  );
}

function PlanAction({
  plan,
  currentPlan,
  enabled,
}: {
  plan: PaidPlanId;
  currentPlan: PaidPlanId | null;
  enabled: boolean;
}) {
  if (!currentPlan) return <SubscribeOptions plan={plan} enabled={enabled} />;

  if (currentPlan === plan) {
    return (
      <Link
        href="/assinatura"
        className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
      >
        Seu plano atual. Ver assinatura
      </Link>
    );
  }

  if (plan === "pessoal") {
    return (
      <p className="mt-6 rounded-xl border border-line bg-tint px-4 py-3 text-center text-sm text-text-soft">
        Já está incluído no seu Forge MEI
      </p>
    );
  }

  return (
    <form action="/api/billing/portal" method="post" className="mt-6">
      <button
        type="submit"
        className="h-12 w-full rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
      >
        Mudar para o Forge MEI
      </button>
    </form>
  );
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const notice = checkout ? NOTICES[checkout] : undefined;
  const entitlement = await getUserEntitlement();
  const currentPlan = isPaidActive(entitlement) && isPaidPlan(entitlement?.planId) ? entitlement.planId : null;
  const enabled = billingEnabled();
  const onTrial = enabled && isOnTrial(entitlement);
  const daysLeft = trialDaysLeft(entitlement?.trialEndsAt);
  const free = PLAN_CATALOG.find((plan) => plan.id === "free")!;
  const pessoal = PLAN_CATALOG.find((plan) => plan.id === "pessoal")!;
  const mei = PLAN_CATALOG.find((plan) => plan.id === "pro")!;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-[22px] border border-line bg-surface p-7 text-center sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-brand-soft">
          <Sparkles className="h-3.5 w-3.5" /> Planos
        </div>
        <h1 className="mx-auto mt-4 max-w-2xl text-4xl font-normal tracking-[-0.035em] text-foreground sm:text-5xl">
          Mande um áudio. Seu gasto já está organizado.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Escolha o Forge Pessoal para a sua vida financeira ou o Forge MEI para cuidar também da sua empresa.
        </p>
      </header>

      {onTrial && (
        <p className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-text-soft">
          Você está no teste grátis: falta{daysLeft === 1 ? "" : "m"} {daysLeft} dia{daysLeft === 1 ? "" : "s"}. Assine
          antes de acabar para não perder o WhatsApp e o modo Empresa.
        </p>
      )}

      {notice && (
        <p
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300"
              : "border-violet-400/25 bg-violet-500/10 text-text-soft"
          }`}
        >
          {notice.text}
        </p>
      )}

      {!enabled && (
        <p className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-center text-sm text-success">
          Por enquanto, tudo, inclusive o WhatsApp, está liberado sem custo. As assinaturas abrem em breve.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Free */}
        <article className="flex flex-col rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold text-foreground">{free.name}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{free.description}</p>
          <p className="mt-5 text-3xl font-bold text-foreground">Grátis</p>
          <PlanFeatures plan={free} />
          <Link
            href="/dashboard"
            className="mt-7 inline-flex h-11 items-center justify-center rounded-xl border border-line bg-tint px-4 text-sm font-medium text-text-soft hover:text-foreground"
          >
            Continuar no Free
          </Link>
        </article>

        {/* Pessoal */}
        <article className="flex flex-col rounded-2xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold text-foreground">{pessoal.name}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{pessoal.description}</p>
          <PlanFeatures plan={pessoal} />
          <PlanAction plan="pessoal" currentPlan={currentPlan} enabled={enabled} />
        </article>

        {/* MEI */}
        <article className="relative flex flex-col rounded-2xl border-2 border-brand bg-surface p-6 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-foreground">{mei.name}</h2>
            <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white">Pessoal + Empresa</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{mei.description}</p>
          <PlanFeatures plan={mei} />
          <PlanAction plan="pro" currentPlan={currentPlan} enabled={enabled} />
        </article>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-text-soft">
            <Icon className="h-4 w-4 shrink-0 text-brand-soft" />
            {text}
          </li>
        ))}
      </ul>

      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-foreground">Perguntas frequentes</h2>
        <div className="mt-4 divide-y divide-line">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:hidden">
                {item.q}
              </summary>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
