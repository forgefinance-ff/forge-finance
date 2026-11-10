// Dados do Raio-X da rotina (Pessoal e Empresa).
import { getCardsOverview } from "@/lib/cards";
import { shiftDate, todayInBrazil } from "@/lib/dates";
import {
  buildAgenda,
  buildAllocation,
  buildCalendar,
  buildCategoryChanges,
  buildHabits,
  buildMonthPace,
  noSpendDays,
  weekdayStats,
  type AgendaItem,
  type CostClass,
  type RxScope,
  type RxTransaction,
  type SpendingGroup,
} from "@/lib/raio-x-calc";
import { firstRelation } from "@/lib/relations";
import { getActiveScope } from "@/lib/scope-server";
import { createClient } from "@/lib/supabase/server";

type CategoryRel = {
  name: string;
  cost_class?: CostClass | null;
  spending_group?: SpendingGroup | null;
} | null;

type Client = Awaited<ReturnType<typeof createClient>>;

type TxRow = {
  amount: number | string;
  type: string;
  kind: string | null;
  transaction_date: string;
  title: string | null;
  description: string | null;
  categories: CategoryRel | CategoryRel[];
};
type PayableRow = {
  kind: string;
  description: string;
  amount: number | string;
  due_date: string;
  customers: { name: string } | { name: string }[] | null;
};
type DasRow = { competence: string; amount: number | string; due_date: string; status: string };

/** Transações do período. Se a migração do grupo de gasto ainda não rodou, busca sem ele. */
async function loadTransactions(supabase: Client, userId: string, scope: RxScope, from: string, to: string) {
  const query = (columns: string) =>
    supabase
      .from("transactions")
      .select(`amount, type, kind, transaction_date, title, description, categories(${columns})`)
      .eq("user_id", userId)
      .eq("scope", scope)
      .gte("transaction_date", from)
      .lte("transaction_date", to)
      .order("transaction_date", { ascending: true })
      .limit(10000);

  const result = await query("name, cost_class, spending_group");
  if (result.error && /spending_group/.test(result.error.message ?? "")) {
    return query("name, cost_class");
  }
  return result;
}

export async function getRaioX() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const scope: RxScope = await getActiveScope();
  const today = todayInBrazil();
  // 13 semanas do calendário + 90 dias de base para comparar = ~7 meses.
  const from = shiftDate(today, -215);
  const weekEnd = shiftDate(today, 6);

  const [txRes, accountsRes, payablesRes, dueRes, dasRes, profileRes, cards] = await Promise.all([
    loadTransactions(supabase, user.id, scope, from, today),
    supabase.from("accounts").select("current_balance").eq("user_id", user.id).eq("scope", scope),
    // Pendentes até o fim da semana (atrasadas entram como "hoje").
    supabase
      .from("payables")
      .select("kind, description, amount, due_date, customers(name)")
      .eq("user_id", user.id)
      .eq("scope", scope)
      .eq("status", "pending")
      .lte("due_date", weekEnd)
      .order("due_date", { ascending: true })
      .limit(300),
    // Vencimentos que aparecem no calendário (pagos ou não).
    supabase
      .from("payables")
      .select("due_date")
      .eq("user_id", user.id)
      .eq("scope", scope)
      .eq("kind", "payable")
      .neq("status", "canceled")
      .gte("due_date", shiftDate(today, -100))
      .lte("due_date", weekEnd)
      .limit(2000),
    scope === "business"
      ? supabase
          .from("mei_das_payments")
          .select("competence, amount, due_date, status")
          .eq("user_id", user.id)
          .neq("status", "canceled")
          .gte("due_date", shiftDate(today, -100))
          .lte("due_date", weekEnd)
          .limit(20)
      : Promise.resolve({ data: [] as DasRow[] }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    getCardsOverview().catch(() => []),
  ]);

  if (txRes.error) throw txRes.error;

  const txRows = (txRes.data ?? []) as unknown as TxRow[];
  const payableRows = (payablesRes.data ?? []) as unknown as PayableRow[];
  const dasRows = (dasRes.data ?? []) as unknown as DasRow[];
  const dueRows = (dueRes.data ?? []) as unknown as { due_date: string }[];
  const accountRows = (accountsRes.data ?? []) as unknown as { current_balance: number | string | null }[];

  const transactions: RxTransaction[] = txRows.map((t) => {
    const category = firstRelation(t.categories as NonNullable<CategoryRel> | NonNullable<CategoryRel>[] | null) as CategoryRel;
    return {
      amount: Number(t.amount),
      type: t.type as "income" | "expense",
      kind: String(t.kind ?? "regular"),
      date: String(t.transaction_date).slice(0, 10),
      text: String(t.title || t.description || ""),
      category: category?.name ?? null,
      costClass: category?.cost_class ?? null,
      spendingGroup: category?.spending_group ?? null,
    };
  });

  // ---- Agenda dos próximos 7 dias
  const agendaItems: AgendaItem[] = [];
  for (const p of payableRows) {
    const customer = firstRelation(p.customers)?.name;
    agendaItems.push({
      kind: p.kind === "receivable" ? "receive" : "pay",
      title: customer && p.kind === "receivable" ? `${customer} · ${p.description}` : String(p.description),
      amount: Number(p.amount),
      date: String(p.due_date).slice(0, 10),
    });
  }
  for (const das of dasRows) {
    if (das.status !== "pending") continue;
    agendaItems.push({
      kind: "tax",
      title: `DAS do MEI (${String(das.competence).slice(5, 7)}/${String(das.competence).slice(0, 4)})`,
      amount: Number(das.amount),
      date: String(das.due_date).slice(0, 10),
    });
  }
  const cardDueDates: string[] = [];
  for (const overview of cards) {
    for (const invoice of overview.invoices) {
      cardDueDates.push(invoice.dueDate);
      if (invoice.pending > 0.009 && invoice.dueDate <= weekEnd && invoice.status !== "paga") {
        agendaItems.push({
          kind: "card",
          title: `Fatura ${overview.card.name}`,
          amount: invoice.pending,
          date: invoice.dueDate,
        });
      }
    }
  }

  const balance = accountRows.reduce((s, a) => s + Number(a.current_balance ?? 0), 0);

  const dueDates = [
    ...dueRows.map((p) => String(p.due_date).slice(0, 10)),
    ...dasRows.map((d) => String(d.due_date).slice(0, 10)),
    ...cardDueDates,
  ];

  const calendar = buildCalendar(transactions, dueDates, today);
  const weekday = weekdayStats(transactions, today);
  const habits = buildHabits(transactions, today, { ownName: profileRes.data?.full_name ?? null });
  const changes = buildCategoryChanges(transactions, today);
  const pace = buildMonthPace(transactions, today);
  const allocation = buildAllocation(transactions, today, scope);
  const agenda = buildAgenda(agendaItems, balance, today);
  const noSpend = scope === "personal" ? noSpendDays(transactions, today) : null;

  // Média de saída por dia útil (Empresa).
  const workdayAvg =
    weekday.averages.slice(0, 5).reduce((s, v) => s + v, 0) / 5;

  return {
    scope,
    today,
    hasData: transactions.some((t) => t.type === "expense"),
    lastDate: habits.until,
    hasAccounts: accountRows.length > 0,
    calendar,
    weekday,
    habits,
    changes,
    pace,
    allocation,
    agenda,
    noSpend,
    workdayAvg: Math.round(workdayAvg * 100) / 100,
  };
}

export type RaioXData = NonNullable<Awaited<ReturnType<typeof getRaioX>>>;
