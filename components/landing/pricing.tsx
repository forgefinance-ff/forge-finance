"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

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

  return (
    <div className="mx-auto max-w-md">
      <div className="mx-auto mb-6 flex w-fit rounded-full border border-black/[0.08] bg-white p-1 shadow-sm">
        {(["year", "month"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setPeriod(option)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition",
              interval === option ? "bg-[#14111f] text-white" : "text-[#4b4563] hover:text-[#14111f]"
            )}
          >
            {option === "year" ? "Anual · 2 meses grátis" : "Mensal"}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-white p-7 text-center shadow-[0_30px_80px_-30px_rgba(76,29,149,0.35)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" />
        <h3 className="text-2xl font-semibold text-[#14111f]">Forge Pro</h3>
        <p className="mt-2 text-sm text-[#6b6585]">Um plano só, com tudo liberado desde o primeiro dia.</p>

        <p className="mt-6 text-sm text-[#6b6585]">{yearly ? "Plano anual · equivale a" : "Plano mensal"}</p>
        <p className="mt-1 flex items-baseline justify-center gap-1 text-[#14111f]">
          <span className="text-2xl font-medium">R$</span>
          <span className="text-6xl font-semibold tracking-tight">{brl(yearly ? perMonth : monthlyCents).replace("R$", "").trim()}</span>
          <span className="text-base text-[#6b6585]">/mês</span>
        </p>
        <p className="mt-2 h-5 text-sm text-[#6b6585]">
          {yearly ? (
            <>
              {brl(yearlyCents)} por ano · <span className="font-medium text-emerald-600">economize {brl(savings)}</span>
            </>
          ) : (
            "Cobrado todo mês, cancele quando quiser"
          )}
        </p>

        <ul className="mt-7 space-y-3 text-left">
          {features.map((feature) => (
            <li key={feature} className="flex gap-3 text-[15px] text-[#2c2740]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#14111f]">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <Link
          href={billingOn ? `/assinar?plano=${yearly ? "anual" : "mensal"}` : "/cadastro"}
          className="mt-8 flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 text-base font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition hover:brightness-110"
        >
          {billingOn ? "Assinar o Forge Pro" : "Entrar no beta grátis"}
        </Link>

        <p className="mt-5 border-t border-black/[0.06] pt-5 text-[13px] text-[#6b6585]">
          {billingOn ? (
            <>
              <span className="font-medium text-[#14111f]">7 dias para desistir.</span> Não gostou, devolvemos tudo.
            </>
          ) : (
            "Estamos em beta: tudo liberado sem custo por enquanto."
          )}
        </p>
      </div>
    </div>
  );
}
