// Contexto que o assistente recebe. Só dados agregados: nada de descrições de
// transações individuais vai para o provedor de IA.
import { getAccounts } from "@/lib/accounts";
import { getCards } from "@/lib/cards";
import { getDashboardData } from "@/lib/dashboard";
import { shiftDate, todayInBrazil } from "@/lib/dates";
import { getGoals } from "@/lib/goals";
import { getInvestments } from "@/lib/investments";
import { getBusinessPanel } from "@/lib/business-panel";
import { getBusinessRevenue, getMeiSettings } from "@/lib/mei";
import { calcLimit } from "@/lib/mei-shared";
import { transactionKindLabel, type MovementKind } from "@/lib/movement-kinds";
import { getDueSummary } from "@/lib/payables";
import { firstRelation } from "@/lib/relations";
import { getActiveScope } from "@/lib/scope-server";
import { createClient } from "@/lib/supabase/server";

const round = (n: number) => Math.round(n * 100) / 100;

/** Contexto curto (perguntas rápidas do dashboard). */
export async function buildQuickContext() {
  const [dashboard, goals, cards] = await Promise.all([
    getDashboardData(),
    getGoals(),
    getCards(),
  ]);

  return {
    hoje: todayInBrazil(),
    patrimonio: {
      total: dashboard.totalBalance,
      contas: dashboard.accountsTotal,
      investimentos: dashboard.investmentsTotal,
    },
    mesAtual: {
      receitas: dashboard.analytics.monthIncome,
      despesas: dashboard.analytics.monthExpense,
      despesasMesAnterior: dashboard.analytics.previousMonthExpense,
      despesasPorCategoria: dashboard.analytics.expenseByCategory.map((c) => ({
        categoria: c.name,
        valor: c.value,
      })),
    },
    fluxoUltimos12Meses: dashboard.chart12m,
    metas: goals.map((g) => ({
      titulo: g.title,
      alvo: g.target_amount,
      atual: g.current_amount,
      prazo: g.deadline,
    })),
    cartoes: cards.map((c) => ({
      nome: c.name,
      limite: c.limit_amount,
      diaFechamento: c.closing_day,
      diaVencimento: c.due_day,
    })),
  };
}

/** Contexto completo (aba do Assistente): 12 meses por categoria e mais. */
export async function buildDeepContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const scope = await getActiveScope();
  const today = todayInBrazil();
  const from = `${shiftDate(today, -365).slice(0, 7)}-01`;

  const [quick, accounts, investments, due, txResult] = await Promise.all([
    buildQuickContext(),
    getAccounts(),
    getInvestments(),
    getDueSummary(),
    user
      ? supabase
          .from("transactions")
          .select("amount, type, kind, transaction_date, categories(name)")
          .eq("user_id", user.id)
          .eq("scope", scope)
          .gte("transaction_date", from)
      : Promise.resolve({ data: [] as unknown[], error: null }),
  ]);

  // Mês x tipo x categoria, separando aportes/empréstimos/reembolsos.
  type Bucket = {
    receitas: Record<string, number>;
    despesas: Record<string, number>;
    outrasMovimentacoes: Record<string, number>;
  };
  const byMonth = new Map<string, Bucket>();

  for (const raw of (txResult.data ?? []) as {
    amount: number;
    type: "income" | "expense";
    kind: MovementKind | null;
    transaction_date: string;
    categories: { name: string } | { name: string }[] | null;
  }[]) {
    const month = String(raw.transaction_date).slice(0, 7);
    const bucket =
      byMonth.get(month) ?? { receitas: {}, despesas: {}, outrasMovimentacoes: {} };
    const category = firstRelation(raw.categories)?.name ?? "Sem categoria";
    const value = Number(raw.amount);
    const kind = raw.kind ?? "regular";

    if (kind !== "regular") {
      const key = `${transactionKindLabel(kind) ?? kind} (${raw.type === "income" ? "entrada" : "saída"})`;
      bucket.outrasMovimentacoes[key] = round((bucket.outrasMovimentacoes[key] ?? 0) + value);
    } else if (raw.type === "income") {
      bucket.receitas[category] = round((bucket.receitas[category] ?? 0) + value);
    } else {
      bucket.despesas[category] = round((bucket.despesas[category] ?? 0) + value);
    }
    byMonth.set(month, bucket);
  }

  const meses = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, bucket]) => {
      const totalReceitas = Object.values(bucket.receitas).reduce((s, v) => s + v, 0);
      const totalDespesas = Object.values(bucket.despesas).reduce((s, v) => s + v, 0);
      return {
        mes,
        totalReceitas: round(totalReceitas),
        totalDespesas: round(totalDespesas),
        resultado: round(totalReceitas - totalDespesas),
        ...bucket,
      };
    });

  let mei: Record<string, unknown> | null = null;
  let gestao: Record<string, unknown> | null = null;
  if (scope === "business") {
    const panel = await getBusinessPanel();
    if (panel) {
      gestao = {
        dreUltimos6Meses: panel.dre.map((m) => ({
          mes: m.month,
          faturamento: m.revenue,
          impostos: m.taxes,
          custosVariaveis: m.variable,
          margemContribuicao: m.contributionMargin,
          custosFixos: m.fixed,
          proLabore: m.prolabore,
          naoClassificado: m.unclassified,
          lucro: m.profit,
          vendas: m.salesCount,
          ticketMedio: m.averageTicket,
          retiradasDeLucro: m.ownerWithdrawals,
        })),
        pontoDeEquilibrio: panel.breakeven,
        caixaHoje: panel.cashToday,
        projecao90Dias: {
          menorSaldo: panel.projection.lowest,
          primeiroDiaNegativo: panel.projection.firstNegative,
          entradasPrevistas: panel.projection.inflow,
          saidasPrevistas: panel.projection.outflow,
        },
        inadimplencia: {
          emAtraso: panel.delinquency.overdueTotal,
          clientesDevendo: panel.delinquency.overdueCustomers,
          atrasoMedioDias: panel.delinquency.averageDaysLate,
        },
        metas: panel.goals,
      };
    }

    const year = Number(today.slice(0, 4));
    const [settings, revenue] = await Promise.all([getMeiSettings(), getBusinessRevenue(year)]);
    const calc = calcLimit(settings, revenue, today);
    mei = {
      faturamentoNoAno: calc.revenue,
      limite: calc.limit,
      percentualDoLimite: calc.percent,
      projecaoNoAno: calc.projection,
      valorDas: settings?.das_amount ?? null,
    };
  }

  return {
    ...quick,
    escopo: scope === "business" ? "Empresa (MEI)" : "Pessoal",
    observacao:
      "Aportes, empréstimos e reembolsos ficam em 'outrasMovimentacoes': mexem no saldo, mas não são receita nem despesa.",
    contas: accounts.map((a) => ({ nome: a.name, tipo: a.type, saldo: Number(a.current_balance) })),
    investimentos: investments.map((i) => ({
      nome: i.name,
      tipo: i.type,
      aportado: Number(i.invested_amount ?? 0),
      atual: Number(i.current_value ?? 0),
    })),
    contasAPagarReceber: {
      atrasadas: { total: due.overdueTotal, quantidade: due.overdueCount },
      proximos7Dias: due.upcoming.map((p) => ({
        tipo: p.kind === "receivable" ? "a receber" : "a pagar",
        valor: p.amount,
        vencimento: p.due_date,
        categoria: p.category_name ?? null,
      })),
    },
    historicoMensal: meses,
    mei,
    gestao,
  };
}
