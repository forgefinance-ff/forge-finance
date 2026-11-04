// Dados do Painel de Gestão da Empresa.
import {
  buildBreakeven,
  buildCashProjection,
  buildDelinquency,
  buildDre,
  shiftMonth,
  type BizPayable,
  type BizTransaction,
  type CostClass,
  type ReceivableRow,
} from "@/lib/business-calc";
import { todayInBrazil } from "@/lib/dates";
import { firstRelation } from "@/lib/relations";
import { createClient } from "@/lib/supabase/server";

export type BusinessAlert = { tone: "danger" | "warning" | "info"; title: string; text: string };

export async function getBusinessPanel() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = todayInBrazil();
  const currentMonth = today.slice(0, 7);
  // 13 meses: compara com o mesmo mês do ano passado.
  const months = Array.from({ length: 13 }, (_, i) => shiftMonth(currentMonth, i - 12));
  const from = `${months[0]}-01`;

  const [accountsRes, personalAccountsRes, txRes, pendingRes, receivablesRes, settingsRes] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, current_balance")
        .eq("user_id", user.id)
        .eq("scope", "business"),
      supabase
        .from("accounts")
        .select("id, name, current_balance")
        .eq("user_id", user.id)
        .eq("scope", "personal"),
      supabase
        .from("transactions")
        .select("amount, type, kind, transaction_date, categories(name, cost_class)")
        .eq("user_id", user.id)
        .eq("scope", "business")
        .gte("transaction_date", from)
        .lte("transaction_date", today),
      supabase
        .from("payables")
        .select("id, kind, description, amount, due_date, recurrence, customer_id, customers(name)")
        .eq("user_id", user.id)
        .eq("scope", "business")
        .eq("status", "pending")
        .order("due_date", { ascending: true })
        .limit(500),
      supabase
        .from("payables")
        .select("amount, due_date, status, paid_at, customer_id, customers(name)")
        .eq("user_id", user.id)
        .eq("scope", "business")
        .eq("kind", "receivable")
        .gte("due_date", `${shiftMonth(currentMonth, -12)}-01`)
        .limit(2000),
      supabase
        .from("mei_settings")
        .select("monthly_revenue_goal, target_margin_pct")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (txRes.error) throw txRes.error;

  const accounts = (accountsRes.data ?? []).map((a) => ({
    id: String(a.id),
    name: String(a.name),
    balance: Number(a.current_balance ?? 0),
  }));
  const personalAccounts = (personalAccountsRes.data ?? []).map((a) => ({
    id: String(a.id),
    name: String(a.name),
    balance: Number(a.current_balance ?? 0),
  }));

  const transactions: BizTransaction[] = (txRes.data ?? []).map((t) => {
    const category = firstRelation(
      t.categories as { name: string; cost_class: CostClass | null } | null
    );
    return {
      amount: Number(t.amount),
      type: t.type as "income" | "expense",
      kind: String(t.kind ?? "regular"),
      date: String(t.transaction_date).slice(0, 10),
      costClass: category?.cost_class ?? null,
      category: category?.name ?? "Sem categoria",
    };
  });

  const dre = buildDre(transactions, months);
  const current = dre[dre.length - 1];
  const previous = dre[dre.length - 2];
  const lastYear = dre[0];
  const last6 = dre.slice(-6);
  // Ponto de equilíbrio: média dos 3 meses fechados anteriores (ou o atual, se não houver).
  const closed = dre.slice(-4, -1).filter((m) => m.revenue > 0 || m.fixed > 0);
  const breakeven = buildBreakeven(closed.length ? closed : [current]);

  const pending: BizPayable[] = (pendingRes.data ?? []).map((p) => ({
    id: String(p.id),
    kind: p.kind as "payable" | "receivable",
    description: String(p.description),
    amount: Number(p.amount),
    dueDate: String(p.due_date).slice(0, 10),
    recurrence: (p.recurrence as "none" | "monthly") ?? "none",
    customerId: (p.customer_id as string | null) ?? null,
    customerName: firstRelation(p.customers as { name: string } | null)?.name ?? null,
  }));

  const cashToday = accounts.reduce((s, a) => s + a.balance, 0);
  const projection = buildCashProjection(cashToday, pending, today, 90);

  const receivables: ReceivableRow[] = (receivablesRes.data ?? []).map((r) => ({
    customerId: (r.customer_id as string | null) ?? null,
    customerName: firstRelation(r.customers as { name: string } | null)?.name ?? null,
    amount: Number(r.amount),
    dueDate: String(r.due_date).slice(0, 10),
    status: r.status as "pending" | "paid" | "canceled",
    paidAt: r.paid_at ? String(r.paid_at).slice(0, 10) : null,
  }));
  const delinquency = buildDelinquency(receivables, today);

  const goals = {
    monthlyRevenue: settingsRes.data?.monthly_revenue_goal
      ? Number(settingsRes.data.monthly_revenue_goal)
      : null,
    targetMarginPct: settingsRes.data?.target_margin_pct
      ? Number(settingsRes.data.target_margin_pct)
      : null,
  };

  // Alertas de mistura PF x PJ e de organização.
  const alerts: BusinessAlert[] = [];
  const withdrawn = current.prolabore + current.ownerWithdrawals;
  const profitBeforeOwner = current.profit + current.prolabore;

  if (withdrawn > 0 && withdrawn > Math.max(profitBeforeOwner, 0)) {
    alerts.push({
      tone: "danger",
      title: "Você tirou mais do que a empresa lucrou este mês",
      text: `Retiradas e pró-labore somam ${brl(withdrawn)}, e o lucro antes deles foi ${brl(
        profitBeforeOwner
      )}. A diferença está saindo do caixa da empresa.`,
    });
  }

  const expenses =
    current.taxes + current.variable + current.fixed + current.prolabore + current.unclassified;
  if (current.unclassified > 0 && expenses > 0 && current.unclassified / expenses > 0.15) {
    alerts.push({
      tone: "warning",
      title: "Despesas sem classificação",
      text: `${brl(current.unclassified)} em despesas deste mês estão em categorias sem classe de custo. Classifique em Categorias para a DRE e o ponto de equilíbrio ficarem certos.`,
    });
  }

  const prolaboreMonths = dre.slice(-3).filter((m) => m.prolabore > 0).length;
  if (current.revenue > 0 && prolaboreMonths === 0) {
    alerts.push({
      tone: "info",
      title: "Sem pró-labore registrado",
      text: "Definir um pró-labore fixo e registrar as retiradas ajuda a separar o seu dinheiro do dinheiro da empresa.",
    });
  }

  if (projection.firstNegative) {
    alerts.push({
      tone: "danger",
      title: "O caixa fica negativo nos próximos 90 dias",
      text: `Pela projeção, o saldo da empresa fica negativo em ${formatDate(
        projection.firstNegative
      )}. Menor saldo: ${brl(projection.lowest.balance)} em ${formatDate(projection.lowest.date)}.`,
    });
  }

  return {
    today,
    accounts,
    personalAccounts,
    cashToday,
    dre: last6,
    current,
    previous,
    lastYear,
    breakeven,
    projection,
    delinquency,
    goals,
    alerts,
  };
}

export type BusinessPanel = NonNullable<Awaited<ReturnType<typeof getBusinessPanel>>>;

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
