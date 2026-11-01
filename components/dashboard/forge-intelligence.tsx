import {
  AlertTriangleIcon,
  CalendarClockIcon,
  CopyIcon,
  SparklesIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";

import { AssistantBox } from "@/components/dashboard/assistant-box";
import type { DashboardAnalytics } from "@/lib/dashboard-analytics";
import { formatCurrency } from "@/lib/formatters";
import type { Card } from "@/lib/cards";
import type { Goal } from "@/lib/goals";

type ForgeIntelligenceProps = {
  analytics: DashboardAnalytics;
  goals: Goal[];
  cards: Card[];
  hasData: boolean;
  aiConfigured: boolean;
};

type Insight = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "neutral" | "warn" | "good";
  title: string;
  text: string;
};

function daysUntilDue(dueDay: number, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let due = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (due < today) due = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function monthsBetween(now: Date, deadline: Date) {
  return Math.max(
    1,
    (deadline.getFullYear() - now.getFullYear()) * 12 +
      (deadline.getMonth() - now.getMonth())
  );
}

function buildInsights(
  analytics: DashboardAnalytics,
  goals: Goal[],
  cards: Card[],
  hasData: boolean
): Insight[] {
  const now = new Date();
  const insights: Insight[] = [];

  if (hasData) {
    const net = analytics.monthIncome - analytics.monthExpense;
    insights.push({
      id: "month",
      icon: TrendingUpIcon,
      tone: net >= 0 ? "good" : "warn",
      title: "Resumo do mês",
      text: `Receitas de ${formatCurrency(analytics.monthIncome)} e despesas de ${formatCurrency(
        analytics.monthExpense
      )}: saldo do mês ${net >= 0 ? "positivo" : "negativo"} em ${formatCurrency(
        Math.abs(net)
      )}.`,
    });
  }

  for (const a of analytics.anomalies) {
    insights.push({
      id: `anomaly-${a.name}`,
      icon: AlertTriangleIcon,
      tone: "warn",
      title: "Gasto fora do padrão",
      text: `${a.name}: ${formatCurrency(a.current)} neste mês, contra média de ${formatCurrency(
        a.average
      )} nos 3 meses anteriores.`,
    });
  }

  const dueSoon = cards
    .filter((c) => c.due_day >= 1 && c.due_day <= 31)
    .map((c) => ({ card: c, days: daysUntilDue(c.due_day, now) }))
    .filter((c) => c.days <= 10)
    .sort((a, b) => a.days - b.days);

  for (const { card, days } of dueSoon.slice(0, 2)) {
    insights.push({
      id: `card-${card.id}`,
      icon: CalendarClockIcon,
      tone: "warn",
      title: "Fatura próxima do vencimento",
      text: `${card.name} vence ${
        days === 0 ? "hoje" : days === 1 ? "amanhã" : `em ${days} dias`
      } (dia ${card.due_day}).`,
    });
  }

  const openGoals = goals
    .filter((g) => g.deadline && Number(g.target_amount) > Number(g.current_amount))
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  if (openGoals[0]) {
    const goal = openGoals[0];
    const remaining = Number(goal.target_amount) - Number(goal.current_amount);
    const months = monthsBetween(now, new Date(`${goal.deadline}T00:00:00`));
    insights.push({
      id: `goal-${goal.id}`,
      icon: TargetIcon,
      tone: "neutral",
      title: "Meta mais próxima",
      text: `${goal.title}: faltam ${formatCurrency(remaining)}. Guardando cerca de ${formatCurrency(
        remaining / months
      )} por mês você chega lá até o prazo.`,
    });
  }

  if (analytics.duplicates[0]) {
    const d = analytics.duplicates[0];
    insights.push({
      id: "duplicate",
      icon: CopyIcon,
      tone: "warn",
      title: "Possível duplicidade",
      text: `${d.count} lançamentos iguais de ${formatCurrency(d.amount)} ("${d.description}") em ${d.date
        .split("-")
        .reverse()
        .join("/")}. Vale conferir.`,
    });
  }

  return insights;
}

const toneClasses = {
  neutral: "text-brand-soft bg-brand/15",
  warn: "text-amber-300 bg-amber-400/10",
  good: "text-emerald-300 bg-emerald-400/10",
} as const;

export function ForgeIntelligence({
  analytics,
  goals,
  cards,
  hasData,
  aiConfigured,
}: ForgeIntelligenceProps) {
  const insights = buildInsights(analytics, goals, cards, hasData);

  return (
    <section className="forge-panel relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 rounded-full border border-brand-bright/25 bg-brand/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-soft">
          <SparklesIcon className="h-3 w-3" />
          Forge Intelligence
        </span>
      </div>

      <p className="relative mt-3 text-[11px] text-zinc-500">
        Análises calculadas por regras sobre os seus dados reais — não são
        geradas por IA.
      </p>

      {insights.length === 0 ? (
        <div className="relative mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-zinc-500">
          Registre transações, metas ou cartões para receber análises
          personalizadas.
        </div>
      ) : (
        <ul className="relative mt-4 space-y-3">
          {insights.slice(0, 5).map((insight) => {
            const Icon = insight.icon;
            return (
              <li key={insight.id} className="flex gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClasses[insight.tone]}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-100">{insight.title}</p>
                  <p className="text-xs leading-relaxed text-zinc-400">{insight.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative mt-5 border-t border-white/[0.06] pt-4">
        <AssistantBox configured={aiConfigured} />
      </div>
    </section>
  );
}
