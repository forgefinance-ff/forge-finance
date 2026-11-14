"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

import { PopNumber, useSlidingPill } from "@/components/motion";

type Props = {
  billingOn: boolean;
  monthlyCents: number;
  yearlyCents: number;
  features: string[];
};

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Pricing({ billingOn, monthlyCents, yearlyCents, features }: Props) {
  const [interval, setPeriod] = useState<"year" | "month">("year");
  const perMonth = Math.round(yearlyCents / 12);
  const savings = monthlyCents * 12 - yearlyCents;
  const yearly = interval === "year";
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>(interval);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <div ref={containerRef} className="uv-switch" role="group" aria-label="Período do plano">
        <span ref={pillRef} aria-hidden className="t-stretch-pill uv-switch__pill" style={{ opacity: 0 }} />
        {(["year", "month"] as const).map((option) => (
          <button key={option} type="button" aria-pressed={interval === option} data-active={interval === option} className="t-tab" onClick={() => setPeriod(option)}>
            {option === "year" ? "Anual, 2 meses grátis" : "Mensal"}
          </button>
        ))}
      </div>

      <div className="uv-plan">
        <h3>Forge Pro</h3>
        <p className="uv-body mt-3">Um plano só, com tudo liberado desde o primeiro dia.</p>

        <p className="uv-label mt-8">{yearly ? "Plano anual, equivale a" : "Plano mensal"}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <PopNumber value={brl(yearly ? perMonth : monthlyCents)} className="uv-figure text-[clamp(2.5rem,4.2vw,3.75rem)]" />
          <span className="uv-label">por mês</span>
        </p>
        <p className="uv-note mt-3 min-h-5">
          {yearly ? `${brl(yearlyCents)} por ano. Economize ${brl(savings)}.` : "Cobrado todo mês, cancele quando quiser"}
        </p>

        <ul className="uv-plan__list">
          {features.map((feature, index) => (
            <li key={feature} className="t-reveal-item" style={{ "--i": index } as React.CSSProperties}>
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              {feature}
            </li>
          ))}
        </ul>

        <Link
          href={billingOn ? `/assinar?plano=${yearly ? "anual" : "mensal"}` : "/cadastro"}
          className="uv-btn uv-btn--primary mt-8 w-full"
        >
          {billingOn ? "Assinar o Forge Pro" : "Entrar no beta grátis"}
        </Link>

        <p className="uv-note mt-5">
          {billingOn ? (
            <>
              <span className="text-[var(--uv-ink)]">7 dias para desistir.</span> Não gostou, devolvemos tudo.
            </>
          ) : (
            "Estamos em beta: tudo liberado sem custo por enquanto."
          )}
        </p>
      </div>
    </div>
  );
}
