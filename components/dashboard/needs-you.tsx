import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowDownLeftIcon,
  CalendarClockIcon,
  CreditCardIcon,
  TargetIcon,
} from "lucide-react";

import { LearnChevron } from "@/components/motion";
import type { CardOverview } from "@/lib/cards";
import { daysBetween, formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import type { Goal } from "@/lib/goals";
import type { DueSummary } from "@/lib/payables";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  amount?: string;
  tone: "danger" | "brand" | "success";
  href: string;
  action: string;
};

function when(date: string, today: string) {
  const days = daysBetween(today, date);
  if (days < 0) return `venceu em ${formatDateBR(date)}`;
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  return `vence em ${days} dias`;
}

function buildItems(
  due: DueSummary,
  cards: CardOverview[],
  goals: Goal[],
  today: string
): Item[] {
  const items: Item[] = [];

  if (due.overdueCount > 0) {
    items.push({
      key: "overdue",
      icon: AlertTriangleIcon,
      title: `${due.overdueCount} ${due.overdueCount === 1 ? "conta atrasada" : "contas atrasadas"}`,
      detail: "Já passou do vencimento",
      amount: formatCurrency(due.overdueTotal),
      tone: "danger",
      href: "/contas-a-pagar-receber?status=atrasadas",
      action: "Resolver",
    });
  }

  for (const { card, summary } of cards) {
    const invoice = summary.overdue[0] ?? summary.toPay[0];
    if (!invoice || invoice.pending <= 0) continue;
    const late = invoice.status === "vencida";
    items.push({
      key: `card-${card.id}`,
      icon: CreditCardIcon,
      title: `Fatura do ${card.name}`,
      detail: late ? `Venceu em ${formatDateBR(invoice.dueDate)}` : `Fechada, ${when(invoice.dueDate, today)}`,
      amount: formatCurrency(invoice.pending),
      tone: late ? "danger" : "brand",
      href: "/cartoes",
      action: "Ver fatura",
    });
  }

  for (const payable of due.upcoming.slice(0, 3)) {
    const receivable = payable.kind === "receivable";
    items.push({
      key: payable.id,
      icon: receivable ? ArrowDownLeftIcon : CalendarClockIcon,
      title: payable.description,
      detail: `${receivable ? "A receber" : "A pagar"}, ${when(payable.due_date, today)}`,
      amount: `${receivable ? "+" : "−"}${formatCurrency(payable.amount)}`,
      tone: receivable ? "success" : "brand",
      href: "/contas-a-pagar-receber",
      action: receivable ? "Ver" : "Pagar",
    });
  }

  for (const goal of goals) {
    if (!goal.deadline || goal.deadline >= today || goal.current_amount >= goal.target_amount) continue;
    items.push({
      key: `goal-${goal.id}`,
      icon: TargetIcon,
      title: `Meta "${goal.title}" passou do prazo`,
      detail: `Faltam ${formatCurrency(goal.target_amount - goal.current_amount)}`,
      tone: "danger",
      href: "/metas",
      action: "Ajustar",
    });
  }

  return items;
}

/** O que pede uma ação agora. Some quando não há nada pendente. */
export function NeedsYou({
  due,
  cards,
  goals,
  today,
}: {
  due: DueSummary;
  cards: CardOverview[];
  goals: Goal[];
  today: string;
}) {
  const items = buildItems(due, cards, goals, today);
  if (items.length === 0) return null;

  return (
    <section className="forge-panel p-5 sm:p-6" aria-labelledby="needs-you-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="needs-you-title" className="forge-panel-title">
          Precisa de você
          <span className="relative ml-2 inline-flex h-5 min-w-5 align-middle">
            <span className="t-badge !static" data-open="true">
              <span className="t-badge-dot flex h-5 min-w-5 items-center justify-center rounded-full bg-text px-1.5 text-[11px] font-semibold text-background">
                {items.length}
              </span>
            </span>
          </span>
        </h2>
        <Link
          href="/contas-a-pagar-receber"
          className="t-learn inline-flex min-h-6 items-center gap-0.5 text-sm font-medium text-brand"
        >
          Contas a pagar
          <LearnChevron />
        </Link>
      </div>

      <ul className="mt-3 divide-y divide-line">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.key} className="t-reveal-item" style={{ "--i": index } as React.CSSProperties}>
              <Link
                href={item.href}
                className="t-row-lift group -mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 hover:bg-tint"
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                    item.tone === "danger" && "bg-danger/10 text-danger",
                    item.tone === "brand" && "bg-accent text-accent-foreground",
                    item.tone === "success" && "bg-success/10 text-success"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                  <span className={cn("block text-xs", item.tone === "danger" ? "text-danger" : "text-muted-foreground")}>
                    {item.detail}
                  </span>
                </span>
                {item.amount && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{item.amount}</span>
                )}
                <span className="hidden shrink-0 rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-foreground transition-colors group-hover:border-text group-hover:bg-text group-hover:text-background sm:inline-flex">
                  {item.action}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
