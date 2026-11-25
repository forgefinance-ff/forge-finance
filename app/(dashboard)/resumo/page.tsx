import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Sparkles } from "lucide-react";

import { HistoryChart } from "@/components/summary/history-chart";
import { MarkSummarySeen } from "@/components/summary/mark-seen";
import { billingEnabled } from "@/lib/billing/config";
import { trialDaysLeft } from "@/lib/billing/manual-access";
import { getUserEntitlement, isOnTrial, isPaidActive } from "@/lib/billing/get-user-plan";
import { todayInBrazil } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import {
  defaultSummaryMonth,
  freshSummaryMonth,
  isLastDayOfMonth,
  lastDayOfMonth,
  loadMonthlySummary,
  loadSummaryHistory,
  monthName,
  shiftMonthYm,
} from "@/lib/monthly-summary";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumo do mês · Forge Finance" };

type SearchParams = Promise<{ mes?: string }>;

export default async function MonthlySummaryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getAuthUser();
  if (!user) return null;

  const today = todayInBrazil();
  const thisMonth = today.slice(0, 7);
  const { mes } = await searchParams;
  const requested = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : null;
  const ym = requested && requested <= thisMonth ? requested : defaultSummaryMonth(today);

  const supabase = await createClient();
  const [summary, history, entitlement] = await Promise.all([
    loadMonthlySummary(supabase, user.id, ym),
    loadSummaryHistory(supabase, user.id, ym),
    getUserEntitlement(user.id),
  ]);

  const partial = ym === thisMonth && !isLastDayOfMonth(today);
  const canGoNext = shiftMonthYm(ym, 1) <= thisMonth;
  const year = ym.slice(0, 4);

  const showInvite = billingEnabled() && !isPaidActive(entitlement);
  const onTrial = isOnTrial(entitlement);
  const daysLeft = trialDaysLeft(entitlement?.trialEndsAt);

  const s = summary;
  const positive = s.saved >= 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {freshSummaryMonth(today) === ym && <MarkSummarySeen month={ym} />}

      <nav className="flex items-center justify-between pt-2" aria-label="Escolher mês">
        <Link
          href={`/resumo?mes=${shiftMonthYm(ym, -1)}`}
          className="glass flex h-10 items-center gap-1 rounded-full px-4 text-sm text-text-soft hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> {monthName(shiftMonthYm(ym, -1))}
        </Link>
        <span className="text-sm text-muted-foreground">Resumo do mês</span>
        {canGoNext ? (
          <Link
            href={`/resumo?mes=${shiftMonthYm(ym, 1)}`}
            className="glass flex h-10 items-center gap-1 rounded-full px-4 text-sm text-text-soft hover:text-foreground"
          >
            {monthName(shiftMonthYm(ym, 1))} <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span className="w-24" />
        )}
      </nav>

      {!s.empty && (
        <div className="flex justify-end">
          <Link
            href={`/relatorio-completo?period=custom&from=${ym}-01&to=${ym}-${String(lastDayOfMonth(ym)).padStart(2, "0")}`}
            className="glass flex h-10 items-center gap-2 rounded-full px-4 text-sm text-text-soft hover:text-foreground"
          >
            <FileText className="h-4 w-4" aria-hidden /> Relatório completo do mês (PDF)
          </Link>
        </div>
      )}

      {/* Destaque */}
      <section className="overflow-hidden rounded-[28px] bg-brand p-7 text-white sm:p-9">
        <p className="flex items-center gap-2 text-sm text-white/80">
          <Sparkles className="h-4 w-4" aria-hidden />
          Seu {s.monthName} de {year}
          {partial && " (até agora)"}
        </p>
        {s.empty ? (
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Nenhum lançamento neste mês ainda.</h1>
        ) : (
          <>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {positive ? "Sobrou" : "Faltou"} {formatCurrency(Math.abs(s.saved))}
            </h1>
            <p className="mt-2 text-white/85">
              {positive && s.savedRate !== null
                ? `Você guardou ${s.savedRate}% de tudo o que entrou.`
                : !positive
                  ? "Você gastou mais do que entrou. Bora ajustar no próximo mês."
                  : "Registre suas entradas para ver quanto sobra."}
            </p>
          </>
        )}
        <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-white/20 pt-5">
          <div>
            <dt className="text-sm text-white/70">Entrou</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCurrency(s.income)}</dd>
          </div>
          <div>
            <dt className="text-sm text-white/70">Saiu</dt>
            <dd className="text-xl font-semibold tabular-nums">{formatCurrency(s.expense)}</dd>
          </div>
        </dl>
      </section>

      {!s.empty && (
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Comparação */}
          <Card title="Comparado ao mês passado">
            {s.expenseChange === null ? (
              <p className="text-sm text-muted-foreground">Sem dados de {monthName(shiftMonthYm(ym, -1))} para comparar.</p>
            ) : (
              <>
                <p className={cn("text-3xl font-semibold tabular-nums", s.expenseChange <= 0 ? "text-success" : "text-destructive")}>
                  {s.expenseChange > 0 ? "+" : ""}
                  {s.expenseChange}%
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {s.expenseChange <= 0 ? "Você gastou menos" : "Você gastou mais"} que em {monthName(shiftMonthYm(ym, -1))} (
                  {formatCurrency(s.prevExpense)}).
                </p>
              </>
            )}
          </Card>

          {/* Hábito */}
          <Card title="Dias com movimento">
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {s.activeDays}
              <span className="text-lg font-normal text-muted-foreground"> de {s.daysInMonth} dias</span>
            </p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-tint" aria-hidden>
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.round((s.activeDays / s.daysInMonth) * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {s.entries} lançamento{s.entries === 1 ? "" : "s"} no mês. Quanto mais dias registrados, mais certo fica o
              resumo.
            </p>
          </Card>

          {/* Últimos 6 meses */}
          <Card title="Últimos 6 meses" className="sm:col-span-2">
            <HistoryChart data={history} month={ym} />
            <p className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden /> Entrou
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden /> Saiu
              </span>
            </p>
          </Card>

          {/* Onde foi o dinheiro */}
          <Card title="Onde mais gastou" className="sm:col-span-2">
            {s.topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum gasto pessoal no mês.</p>
            ) : (
              <ol className="space-y-4">
                {s.topCategories.map((c, i) => (
                  <li key={c.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-foreground">
                        {i + 1}. {c.name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        <span className="font-semibold text-foreground">{formatCurrency(c.amount)}</span> ·{" "}
                        {Math.round(c.share * 100)}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-tint" aria-hidden>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, Math.round(c.share * 100))}%` }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {s.biggest && (
              <p className="mt-4 text-sm text-muted-foreground">
                Maior gasto: <span className="text-foreground">{s.biggest.title}</span> ({formatCurrency(s.biggest.amount)})
              </p>
            )}
          </Card>

          {s.budgets.total > 0 && (
            <Card title="Orçamentos" className={s.business ? undefined : "sm:col-span-2"}>
              <p className="text-3xl font-semibold tabular-nums text-foreground">
                {s.budgets.kept}
                <span className="text-lg font-normal text-muted-foreground"> de {s.budgets.total}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {s.budgets.kept === s.budgets.total
                  ? "Todos dentro do limite. 👏"
                  : "ficaram dentro do limite. Veja em Orçamentos onde passou."}
              </p>
            </Card>
          )}

          {s.business && (
            <Card title="Sua empresa (MEI)" className={s.budgets.total > 0 ? undefined : "sm:col-span-2"}>
              <p className={cn("text-3xl font-semibold tabular-nums", s.business.profit >= 0 ? "text-success" : "text-destructive")}>
                {formatCurrency(s.business.profit)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                de lucro: entrou {formatCurrency(s.business.revenue)} e saiu {formatCurrency(s.business.costs)}.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Convite no fim do teste */}
      {showInvite && (
        <section className="rounded-[22px] border border-brand/30 bg-brand/5 p-6">
          {onTrial ? (
            <>
              <h2 className="text-lg font-semibold text-foreground">
                Seu teste grátis termina em {daysLeft} dia{daysLeft === 1 ? "" : "s"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Continue registrando pelo WhatsApp, com o modo Empresa e este resumo todo mês.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground">Seu teste grátis acabou</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Volte a registrar pelo WhatsApp com o Forge Pessoal, ou use também o modo Empresa com o Forge MEI.
              </p>
            </>
          )}
          <Link
            href="/planos"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white hover:brightness-110"
          >
            Ver planos
          </Link>
        </section>
      )}
    </div>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[22px] border border-line bg-surface p-6", className)}>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
