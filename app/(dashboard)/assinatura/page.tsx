import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CircleHelp, Sparkles } from "lucide-react";
import { getUserEntitlement } from "@/lib/billing/get-user-plan";
import { PLAN_CATALOG, formatMonthlyPrice } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { getAiStatus } from "@/lib/ai/config";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entitlement = await getUserEntitlement(user.id);
  const plan = entitlement ? PLAN_CATALOG.find((item) => item.id === entitlement.planId) : undefined;
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
  const statusLabel = entitlement?.status === "beta" ? "Acesso beta gratuito" : entitlement?.status === "active" ? "Ativo" : "Verificação necessária";

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="rounded-[22px] border border-line bg-surface p-7 sm:p-9">
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-soft">Sua conta</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Plano e assinatura</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Acompanhe seu acesso ao Forge Finance. O beta é gratuito e não há cobranças ativas.</p>
      </header>

      <section className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] to-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm text-muted-foreground">Seu plano atual</p><h2 className="mt-1 text-2xl font-semibold text-foreground">{plan?.name ?? "Acesso indisponível"}</h2><p className="mt-2 text-sm text-muted-foreground">{plan ? formatMonthlyPrice(plan.monthlyPriceCents) : "Não foi possível confirmar seu plano."}</p></div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-success"><CheckCircle2 className="h-4 w-4" />{statusLabel}</span>
        </div>
        <div className="mt-6 border-t border-line pt-5"><p className="text-sm text-text-soft">Durante o beta, você pode continuar usando os recursos financeiros essenciais sem pagamento.</p><Link href="/planos" className="mt-4 inline-flex h-10 items-center rounded-xl border border-violet-300/25 bg-violet-500/10 px-4 text-sm font-medium text-brand-soft hover:bg-violet-500/20">Conhecer os planos</Link></div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-brand-soft"><Sparkles className="h-5 w-5" /></div><div><h2 className="font-semibold text-foreground">Forge Intelligence</h2><p className="text-sm text-muted-foreground">Consumo do assistente neste mês</p></div></div>
        {entitlement ? <div className="mt-6"><div className="flex items-end justify-between gap-4"><p className="text-sm text-muted-foreground">Consultas utilizadas</p><p className="text-lg font-semibold text-foreground">{used} <span className="text-sm font-normal text-faint">de {limit}</span></p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-tint"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400" style={{ width: `${limit > 0 ? Math.min(100, (used / limit) * 100) : 0}%` }} /></div><p className="mt-3 text-sm text-muted-foreground">{ai.configured ? `${remaining} consultas restantes na cota mensal.` : "O assistente de IA está desativado neste ambiente. A cota não será consumida enquanto a integração não estiver configurada."}</p></div> : <p className="mt-5 flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300"><CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />Não foi possível confirmar suas permissões. Atualize a página; o acesso não será elevado automaticamente.</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6"><h2 className="font-semibold text-foreground">O que vem depois?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Os planos Plus e Business ainda não estão à venda. Não há checkout nem cobrança recorrente configurados. Vamos validar o beta antes de ativar pagamentos.</p></section>
    </div>
  );
}
