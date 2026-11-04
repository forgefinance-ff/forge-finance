"use client";

import { useState } from "react";

import { suggestedPrice } from "@/lib/business-calc";
import { parseAmount } from "@/lib/money";

import { brl } from "./format";

const inputClass =
  "w-full rounded-xl border border-line bg-background-soft px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-violet-500";

/** Preço sugerido = custo ÷ (1 − % impostos e variáveis − % margem desejada). */
export function PricingCalculator({ variablePct }: { variablePct: number }) {
  const [cost, setCost] = useState("");
  const [variable, setVariable] = useState(variablePct > 0 ? String(variablePct).replace(".", ",") : "");
  const [margin, setMargin] = useState("20");

  const c = parseAmount(cost);
  const v = variable ? parseAmount(variable) : 0;
  const m = margin ? parseAmount(margin) : 0;
  const price = Number.isFinite(c) && Number.isFinite(v) && Number.isFinite(m) ? suggestedPrice(c, v, m) : null;
  const invalid = v + m >= 100;

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold text-foreground">Calculadora de preço</h2>
      <p className="text-sm text-muted-foreground">
        Quanto cobrar para cobrir impostos, custos variáveis e ainda ter a margem que você quer.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-faint">Custo do produto/serviço (R$)</span>
          <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0,00" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-faint">Impostos e variáveis (%)</span>
          <input inputMode="decimal" value={variable} onChange={(e) => setVariable(e.target.value)} placeholder="0" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-faint">Margem desejada (%)</span>
          <input inputMode="decimal" value={margin} onChange={(e) => setMargin(e.target.value)} placeholder="20" className={inputClass} />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-brand-bright/25 bg-brand/10 p-4">
        <p className="text-xs text-faint">Preço sugerido</p>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {invalid ? "—" : price !== null ? brl(price) : "—"}
        </p>
        <p className="mt-1 text-xs text-faint">
          {invalid
            ? "Impostos + variáveis + margem precisam somar menos de 100%."
            : variablePct > 0
              ? `O percentual de variáveis veio da média da sua empresa (${String(variablePct).replace(".", ",")}%). Ajuste se quiser.`
              : "Informe o percentual de impostos e custos variáveis sobre a venda."}
        </p>
      </div>
    </section>
  );
}
