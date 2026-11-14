import Image from "next/image";

import { ThinkThenStream } from "@/components/motion";
import { buildInsights } from "@/components/dashboard/forge-intelligence";
import type { Card } from "@/lib/cards";
import type { DashboardAnalytics } from "@/lib/dashboard-analytics";
import type { Goal } from "@/lib/goals";

type ForgeBubbleProps = {
  analytics: DashboardAnalytics;
  goals: Goal[];
  cards: Card[];
  hasData: boolean;
};

/** A análise mais importante do momento, como uma mensagem do Forge. */
export function ForgeBubble({ analytics, goals, cards, hasData }: ForgeBubbleProps) {
  // O resumo do mês já está no topo do dashboard; o balão traz outra leitura.
  const insights = buildInsights(analytics, goals, cards, hasData);
  const first = insights.find((item) => item.title !== "Resumo do mês");
  const fallback = hasData
    ? "Tudo em ordem por aqui. Quando eu notar um gasto fora do padrão, uma fatura perto de vencer ou uma meta perto de bater, aviso neste espaço."
    : "Registre suas primeiras transações e eu começo a mostrar o que mudou no seu mês.";
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date());

  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-text">
        <Image src="/icon-f.png" alt="" width={28} height={28} className="h-6 w-6 object-contain" />
      </span>
      <div className="min-w-0 flex-1 rounded-[22px] rounded-tl-md bg-brand p-5 text-white dark:text-background shadow-[var(--shadow-panel)]">
        <p className="font-[family-name:var(--font-display)] text-lg font-medium leading-tight">Forge</p>
        <p className="text-xs opacity-80">Análise automática dos seus números</p>
        <ThinkThenStream
          className="mt-4 min-h-[2.75rem] text-[15px] font-medium leading-snug"
          text={first ? first.text : fallback}
        />
        <p className="mt-3 flex justify-between text-[11px] opacity-75">
          <span>{first ? first.title : hasData ? "Sem alertas" : "Primeiros passos"}</span>
          <span className="tabular-nums">{time}</span>
        </p>
      </div>
    </div>
  );
}
