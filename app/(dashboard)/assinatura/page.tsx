import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, CircleHelp, MessageCircle, Sparkles } from "lucide-react";

import { getAiStatus } from "@/lib/ai/config";
import { billingEnabled } from "@/lib/billing/config";
import { getUserEntitlement, isProActive } from "@/lib/billing/get-user-plan";
import { PLAN_CATALOG, PRO_PRICING, formatBRL } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  beta: "Acesso beta gratuito",
  active: "Ativo",
  past_due: "Pagamento pendente",
  canceled: "Plano gratuito",
  suspended: "Suspenso",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; portal?: string }>;
}) {
  const { checkout, portal } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entitlement = await getUserEntitlement(user.id);
  const plan = entitlement ? PLAN_CATALOG.find((item) => item.id === entitlement.planId) : undefined;
  const isPro = isProActive(entitlement);
  const enabled = billingEnabled();
  const ai = getAiStatus();
  const currentPeriodStart = `${new Date().toISOString().slice(0, 7)}-01`;
  const { data: usage } = await supabase
    .from("usage_records")
    .select("usage_count, period_start")
    .eq("user_id", user.id)
    .eq("resource", "ai_assistant")
    .eq("period_start", currentPeriodStart)
    .maybeSingle();
  const used = Number(usage?.usage_count ?? 0);
  const limit = entitlement?.aiMonthlyLimit ?? 0;
  const remaining = Math.max(0, limit - used);
  const statusLabel = entitlement ? STATUS_LABEL[entitlement.status] ?? "Verificação necessária" : "Verificação necessária";
  const periodEnd = formatDate(entitlement?.currentPeriodEnd ?? null);
  const price =
    entitlement?.billingInterval === "year"
      ? `${formatBRL(PRO_PRICING.year.cents)}/ano`
      : `${formatBRL(PRO_PRICING.month.cents)}/mês`;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="rounded-[22px] border border-line bg-surface p-7 sm:p-9">
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-soft">Sua conta</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Plano e assinatura</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {enabled ? "Acompanhe seu plano, a renovação e o uso da IA." : "O Forge Finance está em beta: tudo liberado e sem cobranças."}
        </p>
      </header>

      {checkout === "sucesso" && (
        <p className="flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Pagamento recebido! Seu Forge Pro é ativado em alguns segundos. Se ainda aparecer o plano gratuito, atualize a página.
        </p>
      )}
      {checkout === "ja-assinante" && (
        <p className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-text-soft">Você já é Forge Pro. 💜</p>
      )}
      {portal === "erro" && (
        <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Não conseguimos abrir o gerenciamento agora. Tente de novo em instantes.
        </p>
      )}

      <section className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] to-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Seu plano atual</p>
            <h2 className="mt-1 text-2xl font-semibold text-foreground">{plan?.name ?? "Acesso indisponível"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isPro ? price : plan ? "Gratuito" : "Não foi possível confirmar seu plano."}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              entitlement?.status === "past_due"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-300"
                : "border-emerald-400/20 bg-emerald-400/10 text-success"
            }`}
          >
            {entitlement?.status === "past_due" ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {statusLabel}
          </span>
        </div>

        <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-text-soft">
          {isPro && periodEnd && (
            <p>
              {entitlement?.cancelAtPeriodEnd
                ? `Assinatura cancelada. Você mantém o Forge Pro até ${periodEnd}.`
                : `Próxima renovação em ${periodEnd}.`}
            </p>
          )}
          {entitlement?.status === "past_due" && (
            <p className="text-amber-700 dark:text-amber-300">
              Não conseguimos cobrar seu cartão. Atualize a forma de pagamento para não perder o Forge Pro.
            </p>
          )}
          {!isPro && (
            <p>
              {enabled
                ? "No plano gratuito, o registro pelo WhatsApp fica desativado. Assine o Forge Pro para liberar."
                : "Durante o beta, você usa tudo, inclusive o WhatsApp, sem pagar nada."}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {entitlement?.hasBillingAccount && (
              <form action="/api/billing/portal" method="post">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500"
                >
                  Gerenciar assinatura e pagamentos
                </button>
              </form>
            )}
            {!isPro && (
              <Link
                href="/planos"
                className="inline-flex h-10 items-center rounded-xl border border-violet-300/25 bg-violet-500/10 px-4 text-sm font-medium text-brand-soft hover:bg-violet-500/20"
              >
                {enabled ? "Assinar o Forge Pro" : "Conhecer o Forge Pro"}
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-brand-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Forge Intelligence</h2>
            <p className="text-sm text-muted-foreground">Consumo do assistente neste mês</p>
          </div>
        </div>
        {entitlement ? (
          <div className="mt-6">
            <div className="flex items-end justify-between gap-4">
              <p className="text-sm text-muted-foreground">Consultas utilizadas</p>
              <p className="text-lg font-semibold text-foreground">
                {used} <span className="text-sm font-normal text-faint">de {limit}</span>
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-tint">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400"
                style={{ width: `${limit > 0 ? Math.min(100, (used / limit) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {ai.configured
                ? `${remaining} consultas restantes na cota mensal.`
                : "O assistente de IA está desativado neste ambiente. A cota não será consumida enquanto a integração não estiver configurada."}
            </p>
          </div>
        ) : (
          <p className="mt-5 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
            <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
            Não foi possível confirmar suas permissões. Atualize a página; o acesso não será elevado automaticamente.
          </p>
        )}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-6">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-soft" />
        <div>
          <h2 className="font-semibold text-foreground">Cancelamento e garantia</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Cancele quando quiser em &quot;Gerenciar assinatura&quot;, sem multa: o Forge Pro continua até o fim do período pago e
            depois sua conta volta para o Free, com todos os dados. Se desistir em até 7 dias da assinatura, devolvemos o valor.
          </p>
        </div>
      </section>
    </div>
  );
}
