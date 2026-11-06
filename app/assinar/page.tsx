import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Lock, RotateCcw, ShieldCheck } from "lucide-react";

import { EmbeddedCheckout } from "@/components/billing/embedded-checkout";
import { billingEnabled } from "@/lib/billing/config";
import { getUserEntitlement, isProActive } from "@/lib/billing/get-user-plan";
import { PLAN_CATALOG, PRO_PRICING, formatBRL, yearlyComparison } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Assinar o Forge Pro · Forge Finance" };

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  const interval = plano === "mensal" ? "month" : "year";
  const planoParam = interval === "month" ? "mensal" : "anual";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem conta: cria (ou entra) e volta direto para cá.
  if (!user) redirect(`/cadastro?next=${encodeURIComponent(`/assinar?plano=${planoParam}`)}`);

  const entitlement = await getUserEntitlement(user.id);
  if (isProActive(entitlement)) redirect("/assinatura?checkout=ja-assinante");

  const enabled = billingEnabled();
  const pro = PLAN_CATALOG.find((plan) => plan.id === "pro")!;
  const { perMonth, savings } = yearlyComparison();
  const yearly = interval === "year";

  return (
    <div className="min-h-screen bg-[#f6f5fa] text-[#14111f]">
      <header className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon-f.png" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
            <span className="font-semibold tracking-tight">Forge Finance</span>
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-[#5b5575]">
            <Lock className="h-3.5 w-3.5" /> Pagamento seguro
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_1.1fr] lg:py-12">
        {/* Resumo */}
        <section>
          <Link href="/#planos" className="inline-flex items-center gap-1.5 text-sm text-[#5b5575] hover:text-[#14111f]">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Assinar o Forge Pro</h1>
          <p className="mt-2 text-[#5b5575]">Seu dinheiro organizado por mensagem ou áudio, direto no WhatsApp.</p>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-sm">
            {(
              [
                ["anual", "Anual", `${formatBRL(perMonth)}/mês`],
                ["mensal", "Mensal", `${formatBRL(PRO_PRICING.month.cents)}/mês`],
              ] as const
            ).map(([value, label, price]) => (
              <Link
                key={value}
                href={`/assinar?plano=${value}`}
                replace
                className={cn(
                  "rounded-xl px-4 py-3 text-left transition",
                  planoParam === value ? "bg-[#14111f] text-white" : "text-[#4b4563] hover:bg-[#f6f5fa]"
                )}
              >
                <span className="flex items-center justify-between text-sm font-semibold">
                  {label}
                  {value === "anual" && (
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px]", planoParam === value ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-50 text-emerald-700")}>
                      2 meses grátis
                    </span>
                  )}
                </span>
                <span className={cn("text-xs", planoParam === value ? "text-white/70" : "text-[#8a84a3]")}>{price}</span>
              </Link>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold">Forge Pro · {yearly ? "anual" : "mensal"}</p>
              <p className="text-xl font-semibold">
                {yearly ? formatBRL(PRO_PRICING.year.cents) : formatBRL(PRO_PRICING.month.cents)}
                <span className="text-sm font-normal text-[#8a84a3]">{yearly ? "/ano" : "/mês"}</span>
              </p>
            </div>
            {yearly && (
              <p className="mt-1 text-sm text-emerald-600">
                Equivale a {formatBRL(perMonth)}/mês · você economiza {formatBRL(savings)}
              </p>
            )}
            <ul className="mt-5 space-y-2.5 border-t border-black/[0.06] pt-5">
              {pro.features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-[#2c2740]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" strokeWidth={3} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-[#5b5575]">
            <li className="flex gap-2.5">
              <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              7 dias para desistir: não gostou, devolvemos tudo.
            </li>
            <li className="flex gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              Sem fidelidade. Cancele quando quiser em Plano e assinatura.
            </li>
            <li className="flex gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
              Os dados do cartão vão direto para o Stripe e nunca passam pelo Forge.
            </li>
          </ul>
        </section>

        {/* Pagamento */}
        <section className="rounded-3xl bg-white p-3 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.35)] sm:p-5">
          {enabled ? (
            <EmbeddedCheckout key={interval} interval={interval} />
          ) : (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-lg font-semibold">As assinaturas abrem ao fim do beta.</p>
              <p className="max-w-sm text-sm text-[#5b5575]">
                Por enquanto, tudo no Forge (inclusive o WhatsApp) está liberado sem custo para você.
              </p>
              <Link href="/dashboard" className="mt-2 rounded-full bg-[#14111f] px-5 py-2.5 text-sm font-semibold text-white">
                Ir para o painel
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
