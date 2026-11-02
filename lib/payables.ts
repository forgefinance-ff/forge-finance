import { shiftDate, todayInBrazil } from "@/lib/dates";
import type {
  Payable,
  PayableKind,
  StatusFilter,
} from "@/lib/payables-shared";
import { firstRelation } from "@/lib/relations";
import { getActiveScope } from "@/lib/scope-server";
import { createClient } from "@/lib/supabase/server";

const SELECT = `
  id, scope, kind, description, amount, due_date, status, paid_at,
  account_id, category_id, customer_id, recurrence, notes, created_at,
  accounts(name),
  categories(name),
  customers(name, phone)
`;

type Row = Omit<Payable, "account_name" | "category_name" | "customer_name" | "customer_phone"> & {
  accounts: { name: string } | { name: string }[] | null;
  categories: { name: string } | { name: string }[] | null;
  customers: { name: string; phone: string | null } | { name: string; phone: string | null }[] | null;
};

function toPayable(row: Row): Payable {
  const { accounts, categories, customers, ...rest } = row;
  const customer = firstRelation(customers);

  return {
    ...rest,
    amount: Number(rest.amount),
    account_name: firstRelation(accounts)?.name ?? null,
    category_name: firstRelation(categories)?.name ?? null,
    customer_name: customer?.name ?? null,
    customer_phone: customer?.phone ?? null,
  };
}

type Filters = {
  kind: PayableKind;
  status: StatusFilter;
  /** Período do vencimento (YYYY-MM-DD, inclusivo). */
  from?: string | null;
  to?: string | null;
};

/** Contas a pagar/receber do escopo ativo, com filtros. */
export async function getPayables(filters: Filters): Promise<Payable[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const today = todayInBrazil();

  let query = supabase
    .from("payables")
    .select(SELECT)
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .eq("kind", filters.kind);

  switch (filters.status) {
    case "pendentes":
      query = query.eq("status", "pending");
      break;
    case "atrasadas":
      query = query.eq("status", "pending").lt("due_date", today);
      break;
    case "pagas":
      query = query.eq("status", "paid");
      break;
    case "canceladas":
      query = query.eq("status", "canceled");
      break;
  }

  if (filters.from) query = query.gte("due_date", filters.from);
  if (filters.to) query = query.lte("due_date", filters.to);

  const { data, error } = await query
    .order("due_date", { ascending: filters.status !== "pagas" })
    .limit(500);

  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map(toPayable);
}

export type DueSummary = {
  overdueTotal: number;
  overdueCount: number;
  upcoming: Payable[];
};

/** Para o dashboard: pendentes atrasadas e as que vencem nos próximos 7 dias. */
export async function getDueSummary(): Promise<DueSummary> {
  const empty = { overdueTotal: 0, overdueCount: 0, upcoming: [] };
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return empty;

  const today = todayInBrazil();

  const { data, error } = await supabase
    .from("payables")
    .select(SELECT)
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .eq("status", "pending")
    .lte("due_date", shiftDate(today, 7))
    .order("due_date", { ascending: true })
    .limit(200);

  if (error) throw error;

  const rows = ((data ?? []) as unknown as Row[]).map(toPayable);
  const overdue = rows.filter((p) => p.due_date < today);

  return {
    overdueTotal: overdue.reduce((sum, p) => sum + p.amount, 0),
    overdueCount: overdue.length,
    upcoming: rows.filter((p) => p.due_date >= today),
  };
}

/** Todas as contas a receber com cliente (para totais e histórico na tela de clientes). */
export async function getCustomerReceivables(): Promise<Payable[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("payables")
    .select(SELECT)
    .eq("user_id", user.id)
    .eq("kind", "receivable")
    .not("customer_id", "is", null)
    .order("due_date", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map(toPayable);
}
