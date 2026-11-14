import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { shiftDate, todayInBrazil } from "@/lib/dates";
import { EMPTY_TOTALS, fetchAllRows, getTotals, type Totals } from "@/lib/totals";

export type StatementRow = {
  id: string;
  type: "income" | "expense";
  kind: string | null;
  title: string | null;
  description: string | null;
  amount: number;
  transaction_date: string;
  account_id: string | null;
  card_id: string | null;
  category_id: string | null;
  transfer_group: string | null;
  accounts: { name: string } | null;
  cards: { name: string } | null;
  categories: { name: string; color: string | null; icon: string | null } | null;
};

export type Statement = {
  /** YYYY-MM do mês exibido. */
  month: string;
  rows: StatementRow[];
  /** Totais do mês até hoje (ou o mês inteiro, se já passou). */
  totals: Totals;
  /** O que ainda vai acontecer no mês (data depois de hoje). */
  upcoming: Totals;
  /** Busca por texto (em todos os meses). */
  query: string;
  /** A busca trouxe o máximo de resultados (pode haver mais). */
  truncated: boolean;
};

const SELECT =
  "id, type, kind, title, description, amount, transaction_date, account_id, card_id, category_id, transfer_group, accounts(name), cards(name), categories(name,color,icon)";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const SEARCH_LIMIT = 200;

export function currentMonth() {
  return todayInBrazil().slice(0, 7);
}

export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Extrato de um mês (ou busca por texto em todo o histórico). */
export async function getStatement(params: { month?: string; q?: string }): Promise<Statement> {
  const month = params.month && MONTH_RE.test(params.month) ? params.month : currentMonth();
  const query = (params.q ?? "").trim().slice(0, 60);
  const empty: Statement = { month, rows: [], totals: EMPTY_TOTALS, upcoming: EMPTY_TOTALS, query, truncated: false };

  const user = await getAuthUser();
  if (!user) return empty;

  const supabase = await createClient();
  const scope = await getActiveScope();
  const today = todayInBrazil();
  const { first, last } = monthBounds(month);

  const base = () =>
    supabase.from("transactions").select(SELECT).eq("user_id", user.id).eq("scope", scope);

  const rowsPromise: Promise<StatementRow[]> = query
    ? (async () => {
        const safe = query.replace(/[%_,()\\]/g, " ");
        const { data, error } = await base()
          .or(`description.ilike.%${safe}%,title.ilike.%${safe}%`)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(SEARCH_LIMIT);
        if (error) throw error;
        return (data ?? []) as unknown as StatementRow[];
      })()
    : fetchAllRows((a, b) =>
        base()
          .gte("transaction_date", first)
          .lte("transaction_date", last)
          .order("transaction_date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(a, b)
      ) as unknown as Promise<StatementRow[]>;

  const pastEnd = last < today ? last : today;
  const [rows, totals, upcoming] = await Promise.all([
    rowsPromise,
    first <= today ? getTotals(supabase, scope, first, pastEnd) : Promise.resolve(EMPTY_TOTALS),
    last > today ? getTotals(supabase, scope, first > today ? first : shiftDate(today, 1), last) : Promise.resolve(EMPTY_TOTALS),
  ]);

  return {
    month,
    rows: rows.map((r) => ({ ...r, amount: Number(r.amount) })),
    totals,
    upcoming,
    query,
    truncated: !!query && rows.length >= SEARCH_LIMIT,
  };
}
