import Link from "next/link";

import { LearnChevron, PopNumber, StaggerReveal } from "@/components/motion";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type MonthHeroProps = {
  greeting: string;
  firstName?: string;
  monthKey: string; // AAAA-MM
  today: string; // AAAA-MM-DD
  monthIncome: number;
  monthExpense: number;
  previousMonthExpense: number;
  totalBalance: number;
  hasData: boolean;
};

function monthName(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 15))
  );
}

/** Valor sem centavos quando é redondo, para a frase ler bem. */
function money(value: number) {
  const abs = Math.round(Math.abs(value) * 100) / 100;
  return abs % 1 === 0
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(abs)
    : formatCurrency(abs);
}

type Pace = { label: string; tone: "ok" | "warn" | "bad"; detail: string };

function pace(income: number, expense: number, monthPct: number): Pace | null {
  if (income <= 0) return null;
  const spent = expense / income;
  if (spent > 1)
    return {
      label: "Gastou mais do que entrou",
      tone: "bad",
      detail: `As saídas já passaram ${Math.round((spent - 1) * 100)}% do que entrou no mês.`,
    };
  if (spent > monthPct + 0.08)
    return {
      label: "Acima do ritmo",
      tone: "warn",
      detail: `Você já usou ${Math.round(spent * 100)}% do que entrou, e o mês está em ${Math.round(monthPct * 100)}%.`,
    };
  return {
    label: "No ritmo",
    tone: "ok",
    detail: `Você usou ${Math.round(spent * 100)}% do que entrou, com ${Math.round(monthPct * 100)}% do mês passado.`,
  };
}

/**
 * Topo do dashboard: responde "como estou este mês?" numa frase, com uma
 * barra que compara o quanto já saiu com o quanto do mês já passou.
 */
export function MonthHero({
  greeting,
  firstName,
  monthKey,
  today,
  monthIncome,
  monthExpense,
  previousMonthExpense,
  totalBalance,
  hasData,
}: MonthHeroProps) {
  const month = monthName(monthKey);
  const left = monthIncome - monthExpense;
  const [y, m, d] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthPct = d / daysInMonth;
  const status = pace(monthIncome, monthExpense, monthPct);
  const spentPct = monthIncome > 0 ? Math.min(monthExpense / monthIncome, 1) : 0;

  const vsLast =
    previousMonthExpense > 0 && monthExpense > 0
      ? Math.round(((monthExpense - previousMonthExpense) / previousMonthExpense) * 100)
      : null;

  const empty = !hasData || (monthIncome === 0 && monthExpense === 0);

  return (
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">
        {greeting}
        {firstName ? `, ${firstName}` : ""} · <span className="capitalize">{month}</span>
      </p>

      {empty ? (
        <StaggerReveal>
          <h1 className="t-stagger-line mt-4 max-w-[18ch] font-[family-name:var(--font-display)] text-[clamp(2.25rem,1.6rem+2.2vw,3.25rem)] font-light leading-[1.02] tracking-[-0.04em] text-foreground">
            Seu mês começa aqui.
          </h1>
          <p className="t-stagger-line t-stagger-line--2 mt-4 max-w-[46ch] text-base text-muted-foreground">
            Registre o primeiro gasto ou recebimento e o Forge mostra, todo dia, quanto entrou, quanto
            saiu e quanto ainda sobra.
          </p>
        </StaggerReveal>
      ) : (
        <StaggerReveal>
          <h1 className="t-stagger-line mt-4 max-w-[22ch] font-[family-name:var(--font-display)] text-[clamp(1.875rem,1.4rem+1.8vw,2.75rem)] font-light leading-[1.08] tracking-[-0.035em] text-foreground text-balance">
            Em {month} entraram{" "}
            <PopNumber value={money(monthIncome)} startDelay={250} className="font-normal tabular-nums" /> e saíram{" "}
            <PopNumber value={money(monthExpense)} startDelay={450} className="font-normal tabular-nums" />.
          </h1>
          <p
            className={cn(
              "t-stagger-line t-stagger-line--2 mt-2 font-[family-name:var(--font-display)] text-[clamp(1.875rem,1.4rem+1.8vw,2.75rem)] font-normal leading-[1.08] tracking-[-0.035em] tabular-nums",
              left >= 0 ? "text-success" : "text-danger"
            )}
          >
            {left >= 0 ? "Sobram " : "Faltam "}
            <PopNumber value={money(left)} startDelay={650} />.
          </p>

          {status && (
            <div className="mt-7 max-w-[560px]">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium",
                    status.tone === "ok" && "text-success",
                    status.tone === "warn" && "text-[oklch(58%_0.15_60)]",
                    status.tone === "bad" && "text-danger"
                  )}
                >
                  <span aria-hidden className={cn("h-2 w-2 rounded-full bg-current", status.tone === "bad" && "t-pulse-dot")} />
                  {status.label}
                </span>
                <span className="text-xs text-faint">
                  Dia {d} de {daysInMonth}
                </span>
              </div>

              <div
                className="relative mt-2.5 h-2.5 rounded-full bg-tint-strong"
                role="img"
                aria-label={status.detail}
              >
                <div
                  className={cn(
                    "t-bar-grow h-full rounded-full",
                    status.tone === "ok" && "bg-success",
                    status.tone === "warn" && "bg-[oklch(70%_0.15_65)]",
                    status.tone === "bad" && "bg-danger"
                  )}
                  style={{ width: `${Math.max(spentPct * 100, 2)}%` }}
                />
                <span
                  aria-hidden
                  className="t-pop-late absolute -top-1 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-text"
                  style={{ left: `${monthPct * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{status.detail}</p>
            </div>
          )}
        </StaggerReveal>
      )}

      <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>
          Patrimônio <span className="font-medium tabular-nums text-foreground">{formatCurrency(totalBalance)}</span>
        </span>
        {vsLast !== null && (
          <span>
            Gastos{" "}
            <span className={cn("font-medium", vsLast <= 0 ? "text-success" : "text-danger")}>
              {vsLast <= 0 ? `${Math.abs(vsLast)}% menores` : `${vsLast}% maiores`}
            </span>{" "}
            que no mês passado
          </span>
        )}
        <Link href="/relatorios" className="t-learn inline-flex min-h-6 items-center gap-0.5 font-medium text-brand">
          Ver relatórios
          <LearnChevron />
        </Link>
      </p>
    </div>
  );
}
