import Link from "next/link";
import { Check, Clock3, Sparkles } from "lucide-react";
import { PLAN_CATALOG, formatMonthlyPrice } from "@/lib/billing/plans";

export default function PlansPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="rounded-[22px] border border-line bg-surface p-7 sm:p-9">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-brand-soft"><Sparkles className="h-3.5 w-3.5" /> Forge Finance</div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Planos que acompanham sua evolução</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Estamos em beta gratuito. Os planos pagos abaixo são propostas futuras, ainda sem checkout ou cobrança ativa.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_CATALOG.map((plan) => (
          <article key={plan.id} className={`flex flex-col rounded-2xl border p-6 ${plan.id === "plus" ? "border-violet-400/40 bg-violet-500/[0.07] shadow-[0_0_35px_rgba(124,58,237,0.10)]" : "border-line bg-surface"}`}>
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-foreground">{plan.name}</h2>{plan.availableNow ? <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-success">Disponível no beta</span> : <span className="rounded-full bg-tint px-2.5 py-1 text-xs text-muted-foreground">Futuro</span>}</div>
            <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>
            <p className="mt-5 text-3xl font-bold text-foreground">{formatMonthlyPrice(plan.monthlyPriceCents)}</p>
            {plan.availableNow ? <ul className="mt-6 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-text-soft"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft" />{feature}</li>)}</ul> : <div className="mt-6 flex-1"><p className="text-xs font-semibold uppercase tracking-wider text-faint">Previsto para uma próxima fase</p><ul className="mt-3 space-y-3">{plan.plannedFeatures.map((feature) => <li key={feature} className="flex gap-2 text-sm text-muted-foreground"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-brand-soft/70" />{feature}</li>)}</ul></div>}
            {plan.availableNow ? <Link href="/assinatura" className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500">Ver meu acesso</Link> : <button type="button" disabled className="mt-7 h-11 cursor-not-allowed rounded-xl border border-line bg-tint px-4 text-sm font-medium text-faint">Ainda não disponível</button>}
          </article>
        ))}
      </div>
      <p className="text-center text-xs leading-5 text-faint">Nenhum pagamento é solicitado durante o beta. Preços futuros são estimativas e podem mudar antes do lançamento comercial.</p>
    </div>
  );
}
