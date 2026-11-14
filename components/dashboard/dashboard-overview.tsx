import { BudgetsMini } from "@/components/dashboard/budgets-mini";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";
import { ExpenseBreakdown } from "@/components/dashboard/expense-breakdown";
import { ForgeBubble } from "@/components/dashboard/forge-bubble";
import { GoalsMini } from "@/components/dashboard/goals-mini";
import { MonthHero } from "@/components/dashboard/month-hero";
import { NeedsYou } from "@/components/dashboard/needs-you";
import { NewTransactionTrigger } from "@/components/dashboard/new-transaction-trigger";
import { RecentList } from "@/components/dashboard/recent-list";
import { WalletStack } from "@/components/dashboard/wallet-stack";
import { createTransaction } from "@/app/actions/transactions";
import { Reveal } from "@/components/motion";
import type { Account } from "@/lib/accounts";
import type { Card, CardOverview } from "@/lib/cards";
import type { Category } from "@/lib/categories";
import type { DashboardData } from "@/lib/dashboard";
import type { Goal } from "@/lib/goals";
import type { Budget } from "@/lib/budgets";
import type { DueSummary } from "@/lib/payables";

type DashboardOverviewProps = {
  data: DashboardData;
  accounts: Account[];
  categories: Category[];
  goals: Goal[];
  budgets: Budget[];
  cards: Card[];
  cardsOverview: CardOverview[];
  dueSummary: DueSummary;
  today: string;
  userName: string | null;
  /** Avisos do escopo Empresa (painel, DAS). */
  alerts?: React.ReactNode;
};

function greeting() {
  // Horário de Brasília, independente do fuso do servidor.
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date())
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Dashboard em três camadas:
 * 1. Como está o mês (uma frase + ritmo) e a leitura do Forge;
 * 2. O que precisa de você agora (só aparece se houver algo);
 * 3. Para entender o mês: categorias, últimas transações, entradas e saídas, metas.
 * Patrimônio detalhado, distribuição e atividade ficam em Relatórios.
 */
export function DashboardOverview({
  data,
  accounts,
  categories,
  goals,
  budgets,
  cards,
  cardsOverview,
  dueSummary,
  today,
  userName,
  alerts,
}: DashboardOverviewProps) {
  const firstName = userName?.split(" ")[0];
  const { analytics } = data;

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 items-start gap-8 pt-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
        <MonthHero
          greeting={greeting()}
          firstName={firstName}
          monthKey={analytics.monthKey}
          today={today}
          monthIncome={analytics.monthIncome}
          monthExpense={analytics.monthExpense}
          previousMonthExpense={analytics.previousMonthExpense}
          totalBalance={data.totalBalance}
          hasData={data.hasData}
        />

        <div className="min-w-0 space-y-4 lg:pt-8">
          <ForgeBubble
            analytics={analytics}
            goals={goals}
            // Só avisa vencimento de cartão com fatura fechada a pagar.
            cards={cardsOverview
              .filter((o) => o.summary.toPay.some((invoice) => invoice.pending > 0))
              .map((o) => o.card)}
            hasData={data.hasData}
          />
          <div className="pl-14">
            <NewTransactionTrigger
              action={createTransaction}
              accounts={accounts}
              categories={categories}
              cards={cards}
              label="Registrar transação"
              className="t-plus-spin h-11 rounded-full glass-primary px-5 text-sm font-semibold !text-background transition-colors"
            />
          </div>
        </div>
      </div>

      {alerts}

      <Reveal>
        <NeedsYou due={dueSummary} cards={cardsOverview} goals={goals} today={today} />
      </Reveal>

      {data.hasData && (
        <Reveal>
          <BudgetsMini budgets={budgets} />
        </Reveal>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
        <Reveal className="min-w-0 xl:col-span-4">
          <WalletStack cards={cardsOverview} holder={userName} />
        </Reveal>
        <Reveal className="min-w-0 xl:col-span-4" delay={80}>
          <ExpenseBreakdown slices={analytics.expenseByCategory} total={analytics.monthExpense} />
        </Reveal>
        <Reveal className="min-w-0 md:col-span-2 xl:col-span-4" delay={160}>
          <GoalsMini goals={goals} />
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Reveal className="min-w-0 lg:col-span-5">
          <RecentList transactions={data.recentTransactions} />
        </Reveal>
        <Reveal className="min-w-0 lg:col-span-7" delay={80}>
          <DashboardChart
            chart7d={data.chart7d}
            chart30d={data.chart30d}
            chart12m={data.chart12m}
            totalBalance={data.totalBalance}
            title="Entradas e saídas"
            showBalance={false}
          />
        </Reveal>
      </div>
    </section>
  );
}
