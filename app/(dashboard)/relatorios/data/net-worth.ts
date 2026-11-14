import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { todayInBrazil } from "@/lib/dates";

export type NetWorthItem = {
  month: string;
  patrimonio: number;
};

const MONTHS = 12;

function monthEnd(year: number, month: number) {
  // month 1-12 → último dia do mês, AAAA-MM-DD
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/**
 * Patrimônio ao fim de cada um dos últimos 12 meses.
 *
 * O banco guarda só o saldo atual das contas, então o histórico é
 * reconstruído de trás para frente: saldo de hoje menos tudo o que entrou
 * nas contas depois do fim de cada mês (e mais tudo o que saiu). Compras no
 * cartão não mexem no saldo (só o pagamento da fatura mexe), então ficam de
 * fora. Investimentos não têm histórico de valor: entram pelo valor atual.
 */
export async function getNetWorthData(): Promise<NetWorthItem[]> {
  const supabase = await createClient();

  const user = await getAuthUser();

  if (!user) return [];

  const scope = await getActiveScope();
  const today = todayInBrazil();
  const [ty, tm] = today.split("-").map(Number);
  const firstMonth = new Date(Date.UTC(ty, tm - 1 - (MONTHS - 1), 1));
  const since = monthEnd(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + 1);

  const [accountsRes, investmentsRes, movementsRes] = await Promise.all([
    supabase.from("accounts").select("current_balance").eq("user_id", user.id).eq("scope", scope),
    supabase.from("investments").select("current_value").eq("user_id", user.id).eq("scope", scope),
    supabase.rpc("ff_account_daily_net", { p_scope: scope, p_after: since }),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (investmentsRes.error) throw investmentsRes.error;
  if (movementsRes.error) throw movementsRes.error;

  const accountsNow = (accountsRes.data ?? []).reduce((sum, a) => sum + Number(a.current_balance), 0);
  const investments = (investmentsRes.data ?? []).reduce((sum, i) => sum + Number(i.current_value), 0);
  // Quanto as contas mudaram em cada dia (somado no banco).
  const movements = ((movementsRes.data ?? []) as { day: string; net: number | string }[]).map((t) => ({
    date: String(t.day).slice(0, 10),
    signed: Number(t.net),
  }));

  const items: NetWorthItem[] = [];

  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const end = i === 0 ? today : monthEnd(year, month);

    const after = movements.reduce((sum, m) => (m.date > end ? sum + m.signed : sum), 0);
    const total = accountsNow - after + investments;

    items.push({
      month: new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
      patrimonio: Math.round(total * 100) / 100,
    });
  }

  return items;
}

export type NetWorthDay = { date: string; value: number };

/**
 * Patrimônio no fim de cada dia dos últimos 365 dias (para o gráfico de
 * velas). Mesma reconstrução de getNetWorthData: saldo atual das contas
 * menos o que entrou depois de cada dia (e mais o que saiu), mais o valor
 * atual dos investimentos.
 */
export async function getNetWorthDaily(): Promise<NetWorthDay[]> {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return [];

  const scope = await getActiveScope();
  const today = todayInBrazil();
  const DAYS = 365;
  const [ty, tm, td] = today.split("-").map(Number);
  const startDate = new Date(Date.UTC(ty, tm - 1, td - (DAYS - 1)));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const since = iso(new Date(startDate.getTime() - 864e5));

  const [accountsRes, investmentsRes, movementsRes] = await Promise.all([
    supabase.from("accounts").select("current_balance").eq("user_id", user.id).eq("scope", scope),
    supabase.from("investments").select("current_value").eq("user_id", user.id).eq("scope", scope),
    supabase.rpc("ff_account_daily_net", { p_scope: scope, p_after: since }),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (investmentsRes.error) throw investmentsRes.error;
  if (movementsRes.error) throw movementsRes.error;

  const accountsNow = (accountsRes.data ?? []).reduce((s, a) => s + Number(a.current_balance), 0);
  const investments = (investmentsRes.data ?? []).reduce((s, i) => s + Number(i.current_value), 0);

  // Soma do que mexeu nas contas em cada dia.
  const byDay = new Map<string, number>();
  for (const t of (movementsRes.data ?? []) as { day: string; net: number | string }[]) {
    byDay.set(String(t.day).slice(0, 10), Number(t.net));
  }

  // Tudo o que aconteceu depois de hoje (lançamentos futuros) também sai.
  let after = 0;
  for (const [date, v] of byDay) if (date > today) after += v;

  const out: NetWorthDay[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(Date.UTC(ty, tm - 1, td - i));
    const date = iso(d);
    out.push({ date, value: Math.round((accountsNow - after + investments) * 100) / 100 });
    after += byDay.get(date) ?? 0;
  }
  return out.reverse();
}
