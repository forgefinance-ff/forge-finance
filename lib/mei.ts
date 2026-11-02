import { daysBetween, todayInBrazil } from "@/lib/dates";
import {
  previousCompetence,
  type DasPayment,
  type MeiSettings,
} from "@/lib/mei-shared";
import { createClient } from "@/lib/supabase/server";

async function getUserClient() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

/** Configurações do MEI ou null se o usuário ainda não salvou nenhuma. */
export async function getMeiSettings(): Promise<MeiSettings | null> {
  const { supabase, user } = await getUserClient();
  if (!user) return null;

  const { data, error } = await supabase
    .from("mei_settings")
    .select("activity, das_due_day, annual_limit, das_amount, opening_date, dasn_due_date")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    das_due_day: Number(data.das_due_day),
    annual_limit: data.annual_limit === null ? null : Number(data.annual_limit),
    das_amount: data.das_amount === null ? null : Number(data.das_amount),
  } as MeiSettings;
}

/** Guias do DAS com competência no ano informado. */
export async function getDasPayments(year: number): Promise<DasPayment[]> {
  const { supabase, user } = await getUserClient();
  if (!user) return [];

  const { data, error } = await supabase
    .from("mei_das_payments")
    .select("id, competence, amount, due_date, status, paid_at")
    .eq("user_id", user.id)
    .gte("competence", `${year}-01-01`)
    .lte("competence", `${year}-12-01`)
    .order("competence", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((d) => ({ ...d, amount: Number(d.amount) })) as DasPayment[];
}

/** Soma das RECEITAS do escopo Empresa no ano (faturamento acumulado). */
export async function getBusinessRevenue(year: number): Promise<number> {
  const { supabase, user } = await getUserClient();
  if (!user) return 0;

  const { data, error } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", user.id)
    .eq("scope", "business")
    .eq("type", "income")
    .gte("transaction_date", `${year}-01-01`)
    .lte("transaction_date", `${year}-12-31`);

  if (error) throw error;

  return (data ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
}

export type DasReminder =
  | { kind: "due"; das: DasPayment; days: number }
  | { kind: "missing"; competence: string }
  | null;

/**
 * Lembrete do dashboard: o DAS pendente mais antigo (com dias até o vencimento)
 * ou, se não houver, a competência do mês anterior ainda não gerada.
 */
export async function getDasReminder(): Promise<DasReminder> {
  const { supabase, user } = await getUserClient();
  if (!user) return null;

  const today = todayInBrazil();

  const [{ data: pending }, settings] = await Promise.all([
    supabase
      .from("mei_das_payments")
      .select("id, competence, amount, due_date, status, paid_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    getMeiSettings(),
  ]);

  if (pending) {
    const das = { ...pending, amount: Number(pending.amount) } as DasPayment;
    return { kind: "due", das, days: daysBetween(today, das.due_date) };
  }

  // Sem configurações, o usuário ainda não usa a área de impostos.
  if (!settings) return null;

  const competence = previousCompetence(today);

  if (settings.opening_date && competence < `${settings.opening_date.slice(0, 7)}-01`) {
    return null;
  }

  const { count } = await supabase
    .from("mei_das_payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("competence", competence);

  return (count ?? 0) === 0 ? { kind: "missing", competence } : null;
}
