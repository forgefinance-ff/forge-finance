import { AlertTriangleIcon, TrendingUpIcon } from "lucide-react";

import { formatCurrency } from "@/lib/formatters";
import { MONTHS_LONG, type LimitCalc } from "@/lib/mei-shared";
import { cn } from "@/lib/utils";

function pct(value: number) {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

/** Faturamento acumulado do ano x limite, com a conta do limite proporcional. */
export function RevenueLimitCard({ calc }: { calc: LimitCalc }) {
  const width = Math.min(calc.percent ?? 0, 100);

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <TrendingUpIcon className="h-5 w-5 text-brand-soft" />
            Faturamento de {calc.year}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Soma das receitas do escopo Empresa no ano.
          </p>
        </div>

        {calc.percent !== null && (
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-semibold tabular-nums",
              calc.level === "danger"
                ? "border-danger/40 bg-danger/10 text-danger"
                : calc.level === "warning"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-line bg-tint text-text-soft"
            )}
          >
            {pct(calc.percent)} do limite
          </span>
        )}
      </div>

      <p className="mt-5 text-3xl font-bold tabular-nums text-foreground">
        {formatCurrency(calc.revenue)}
        {calc.limit !== null && (
          <span className="text-base font-medium text-faint"> de {formatCurrency(calc.limit)}</span>
        )}
      </p>

      {calc.limit === null ? (
        <p className="mt-4 rounded-2xl border border-dashed border-line-strong p-4 text-sm text-muted-foreground">
          Informe o <strong className="text-foreground">limite anual</strong> nas configurações do
          MEI para acompanhar quanto falta. O app não usa nenhum valor padrão.
        </p>
      ) : (
        <>
          <div
            role="progressbar"
            aria-label="Faturamento em relação ao limite"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(width)}
            className="mt-4 h-3 overflow-hidden rounded-full bg-tint-strong"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all",
                calc.level === "danger"
                  ? "bg-danger"
                  : calc.level === "warning"
                    ? "bg-warning"
                    : "bg-gradient-to-r from-brand to-brand-indigo"
              )}
              style={{ width: `${width}%` }}
            />
          </div>

          {calc.level !== "ok" && (
            <p
              role="alert"
              className={cn(
                "mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm",
                calc.level === "danger"
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-warning/40 bg-warning/10 text-warning"
              )}
            >
              <AlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {calc.level === "danger"
                ? "Você atingiu ou passou o limite de faturamento informado. Procure um contador para entender o que fazer."
                : "Você já usou 80% ou mais do limite informado. Acompanhe de perto os próximos meses."}
            </p>
          )}

          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat
              label={calc.remaining !== null && calc.remaining < 0 ? "Acima do limite" : "Quanto falta"}
              value={formatCurrency(Math.abs(calc.remaining ?? 0))}
              tone={calc.remaining !== null && calc.remaining < 0 ? "danger" : undefined}
            />
            <Stat label="Média mensal" value={formatCurrency(calc.monthlyAverage)} />
            <Stat
              label={`Projeção para ${calc.year}`}
              value={formatCurrency(calc.projection)}
              tone={calc.limit !== null && calc.projection > calc.limit ? "warning" : undefined}
            />
          </dl>
        </>
      )}

      <div className="mt-4 space-y-1 text-xs text-faint">
        <p>
          Projeção simples: média mensal ({formatCurrency(calc.revenue)} ÷ {calc.monthsElapsed}{" "}
          {calc.monthsElapsed === 1 ? "mês" : "meses"}) × {calc.monthsInYear}{" "}
          {calc.monthsInYear === 1 ? "mês" : "meses"} de atividade no ano.
        </p>
        {calc.proportional && calc.limit !== null && (
          <p>
            Limite proporcional (abertura em {MONTHS_LONG[calc.proportional.openingMonth - 1]}, mês
            contado como inteiro): {formatCurrency(calc.proportional.annualLimit)} ÷ 12 ×{" "}
            {calc.proportional.months} {calc.proportional.months === 1 ? "mês" : "meses"} ={" "}
            {formatCurrency(calc.limit)}.
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-2xl border border-line bg-tint p-3">
      <dt className="text-xs text-faint">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 font-semibold tabular-nums",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
