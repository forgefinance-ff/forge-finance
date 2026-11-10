// Raio-X da rotina: cálculos puros (sem banco), para o escopo Pessoal e Empresa.
//
// Só usa o que todo lançamento tem (data, valor, descrição, categoria e
// natureza). O horário do registro NÃO é usado: extratos importados não têm
// hora, então um mapa por horário mostraria um padrão falso.

import { daysBetween, shiftDate } from "@/lib/dates";
import { countsAsResult } from "@/lib/movement-kinds";

export type RxScope = "personal" | "business";

export type CostClass = "variable" | "fixed" | "tax" | "prolabore";
export type SpendingGroup = "essential" | "lifestyle";

export type RxTransaction = {
  amount: number;
  type: "income" | "expense";
  kind: string;
  date: string; // AAAA-MM-DD
  text: string; // título ou descrição
  category: string | null;
  costClass: CostClass | null;
  spendingGroup: SpendingGroup | null;
};

/** Despesa de verdade (entra no resultado). Exclui aportes, empréstimos, reembolsos e pagamento de fatura. */
export const isSpend = (t: RxTransaction) => t.type === "expense" && countsAsResult(t.kind);
const isRevenue = (t: RxTransaction) => t.type === "income" && countsAsResult(t.kind);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Dia da semana com segunda = 0 ... domingo = 6. */
export function weekdayIndex(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export const WEEKDAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const WEEKDAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function sumByDate(txs: RxTransaction[], pick: (t: RxTransaction) => boolean) {
  const map = new Map<string, number>();
  for (const t of txs) if (pick(t)) map.set(t.date, (map.get(t.date) ?? 0) + t.amount);
  return map;
}

/** Última data com qualquer lançamento (até hoje). Dias depois dela não têm dado, não são "sem gasto". */
export function lastDataDate(txs: RxTransaction[], today: string) {
  let last: string | null = null;
  for (const t of txs) if (t.date <= today && (!last || t.date > last)) last = t.date;
  return last;
}

/* ------------------------------------------------------------------ */
/* 1) Calendário de calor: 13 semanas (segunda a domingo)              */
/* ------------------------------------------------------------------ */

export type CalendarDay = {
  date: string;
  spent: number;
  received: number;
  due: number; // contas/impostos/faturas que vencem no dia
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
  noData: boolean; // depois do último lançamento
};

export function buildCalendar(
  txs: RxTransaction[],
  dueDates: string[],
  today: string,
  weeks = 13
) {
  const spent = sumByDate(txs, isSpend);
  const received = sumByDate(txs, isRevenue);
  const due = new Map<string, number>();
  for (const d of dueDates) due.set(d, (due.get(d) ?? 0) + 1);
  const last = lastDataDate(txs, today);

  const start = shiftDate(today, -weekdayIndex(today) - (weeks - 1) * 7);

  // Níveis por quartis dos dias com gasto (fica bom para quem gasta pouco e para quem gasta muito).
  const values = [...spent.entries()]
    .filter(([d, v]) => d >= start && d <= today && v > 0)
    .map(([, v]) => v)
    .sort((a, b) => a - b);
  const q = (p: number) => (values.length ? values[Math.min(values.length - 1, Math.floor(p * values.length))] : 0);
  const cuts = [q(0.25), q(0.5), q(0.8)];

  const grid: CalendarDay[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = shiftDate(start, w * 7 + d);
      const value = spent.get(date) ?? 0;
      const level: CalendarDay["level"] =
        value <= 0 ? 0 : value <= cuts[0] ? 1 : value <= cuts[1] ? 2 : value <= cuts[2] ? 3 : 4;
      column.push({
        date,
        spent: round2(value),
        received: round2(received.get(date) ?? 0),
        due: due.get(date) ?? 0,
        level,
        future: date > today,
        noData: !last || (date > last && date <= today),
      });
    }
    grid.push(column);
  }

  // Dias do mês que concentram mais saídas (ex.: "5 e 20").
  const byDayOfMonth = new Map<number, number>();
  let total = 0;
  for (const col of grid)
    for (const day of col) {
      if (day.spent <= 0) continue;
      const dom = Number(day.date.slice(8, 10));
      byDayOfMonth.set(dom, (byDayOfMonth.get(dom) ?? 0) + day.spent);
      total += day.spent;
    }
  const peaks = [...byDayOfMonth.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const peakShare = total > 0 ? peaks.reduce((s, [, v]) => s + v, 0) / total : 0;

  return {
    weeks: grid,
    peakDays: peaks.map(([d]) => d).sort((a, b) => a - b),
    peakShare,
    total: round2(total),
  };
}

/* ------------------------------------------------------------------ */
/* 2) Dia da semana mais caro (últimas 13 semanas)                     */
/* ------------------------------------------------------------------ */

export function weekdayStats(txs: RxTransaction[], today: string, weeks = 13) {
  const last = lastDataDate(txs, today) ?? today;
  const from = shiftDate(last, -(weeks * 7) + 1);
  const spent = sumByDate(txs, isSpend);

  const totals = Array(7).fill(0) as number[];
  const counts = Array(7).fill(0) as number[];
  for (let i = 0; i < weeks * 7; i++) {
    const date = shiftDate(from, i);
    const wd = weekdayIndex(date);
    totals[wd] += spent.get(date) ?? 0;
    counts[wd] += 1;
  }
  const averages = totals.map((t, i) => (counts[i] ? round2(t / counts[i]) : 0));
  let top = 0;
  averages.forEach((v, i) => {
    if (v > averages[top]) top = i;
  });
  const others = averages.filter((_, i) => i !== top);
  const othersAvg = others.reduce((s, v) => s + v, 0) / (others.length || 1);

  return {
    averages,
    top,
    topAverage: averages[top],
    ratio: othersAvg > 0 ? averages[top] / othersAvg : null,
    hasData: totals.some((v) => v > 0),
  };
}

/* ------------------------------------------------------------------ */
/* 3) Dias sem gastar (Pessoal)                                        */
/* ------------------------------------------------------------------ */

export function noSpendDays(txs: RxTransaction[], today: string) {
  const last = lastDataDate(txs, today);
  if (!last) return { daysWithout: 0, daysCounted: 0, streak: 0, best: 0, until: null as string | null };

  const spent = sumByDate(txs, isSpend);
  const monthStart = `${today.slice(0, 7)}-01`;
  // Se o último lançamento é de um mês anterior, conta o mês do último lançamento.
  const from = last < monthStart ? `${last.slice(0, 7)}-01` : monthStart;

  let daysWithout = 0;
  let daysCounted = 0;
  let run = 0;
  let best = 0;
  for (let d = from; d <= last; d = shiftDate(d, 1)) {
    daysCounted++;
    if ((spent.get(d) ?? 0) <= 0) {
      daysWithout++;
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  // Sequência atual: dias seguidos sem gasto até o último lançamento.
  let streak = 0;
  for (let d = last; d >= from && (spent.get(d) ?? 0) <= 0; d = shiftDate(d, -1)) streak++;

  return { daysWithout, daysCounted, streak, best, until: last };
}

/* ------------------------------------------------------------------ */
/* 4) Hábitos que se repetem                                           */
/* ------------------------------------------------------------------ */

const PREFIXES = [
  "pix enviado",
  "pix agendado",
  "pix",
  "pagamento realizado",
  "pagamento efetuado",
  "pagamento de",
  "pagamento",
  "compra no debito",
  "compra no credito",
  "compra com cartao",
  "compra cartao",
  "compra debito",
  "compra",
  "transferencia enviada",
  "transferencia",
  "ted enviada",
  "ted",
  "doc",
  "boleto pago",
  "pagto",
  "debito automatico",
  "debito",
];

const STOPWORDS = new Set([
  "ltda", "ltd", "sa", "s", "a", "me", "mei", "epp", "eireli", "cia", "em", "recuperacao",
  "recupera", "do", "da", "de", "dos", "das", "brasil", "tecnologia", "comercio", "servicos",
]);

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** "Pix enviado · UBER DO BRASIL TECNOLOGIA" -> "uber". Vazio se não sobrar nome útil. */
export function habitKey(text: string) {
  let s = stripAccents(text.toLowerCase());
  for (const prefix of PREFIXES) {
    const re = new RegExp(`^${prefix}\\s*[·:\\-–|/]*\\s*`);
    if (re.test(s)) {
      s = s.replace(re, "");
      break;
    }
  }
  s = s.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  const words = s.split(" ").filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return words.slice(0, 2).join(" ");
}

/** Nome para exibir: tira o prefixo do banco e deixa em "Título". */
export function habitLabel(text: string) {
  let s = text.trim();
  const plain = stripAccents(s.toLowerCase());
  for (const prefix of PREFIXES) {
    const re = new RegExp(`^${prefix}\\s*[·:\\-–|/]*\\s*`);
    const m = plain.match(re);
    if (m) {
      s = s.slice(m[0].length);
      break;
    }
  }
  s = s
    .replace(/\b(LTDA|LTD|EIRELI|EPP)\b\.?/gi, "")
    .replace(/\s+S\s*[./]?\s*A\.?(\s|$)/gi, " ")
    .replace(/\s+(ME|EM RECUPERA\w*)\s*$/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) s = text.trim();
  if (/^qr code/i.test(stripAccents(s))) return "Pix por QR Code (sem nome)";
  const small = new Set(["de", "da", "do", "das", "dos", "e", "em", "por"]);
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .slice(0, 48);
}

export type HabitTag = "subscription" | "rising" | "small" | null;

export type Habit = {
  key: string;
  label: string;
  category: string | null;
  count: number; // vezes em 90 dias
  perMonth: number; // vezes por mês
  average: number; // valor médio
  monthly: number; // custo médio por mês
  yearly: number;
  tag: HabitTag;
  change: number | null; // % últimos 30 dias x média dos 60 anteriores
};

/** Coisas que não são hábito: pagamento de fatura e transferência para si mesmo. */
function ignoredForHabits(text: string, ownName: string | null) {
  const t = stripAccents(text.toLowerCase());
  if (/fatura|pagamento de cartao|pagto cartao/.test(t)) return true;
  if (ownName) {
    const parts = stripAccents(ownName.toLowerCase()).split(/\s+/).filter((p) => p.length > 2);
    if (parts.length >= 2 && parts.slice(0, 2).every((p) => t.includes(p))) return true;
  }
  return false;
}

export function buildHabits(
  txs: RxTransaction[],
  today: string,
  options: { ownName?: string | null; limit?: number } = {}
) {
  const last = lastDataDate(txs, today) ?? today;
  const from = shiftDate(last, -89); // 90 dias até o último lançamento
  const recentFrom = shiftDate(last, -29);

  type Acc = {
    key: string;
    labels: Map<string, number>;
    categories: Map<string, number>;
    amounts: number[];
    dates: string[];
    recent: number;
    older: number;
  };
  const groups = new Map<string, Acc>();

  for (const t of txs) {
    if (!isSpend(t) || t.date < from || t.date > last) continue;
    const text = t.text?.trim() ?? "";
    if (ignoredForHabits(text, options.ownName ?? null)) continue;
    let key = habitKey(text);
    let label = habitLabel(text);
    if (!key) {
      // Sem nome útil: agrupa pela categoria.
      if (!t.category) continue;
      key = `cat:${t.category.toLowerCase()}`;
      label = `${t.category} (sem descrição)`;
    }
    const acc =
      groups.get(key) ??
      ({ key, labels: new Map(), categories: new Map(), amounts: [], dates: [], recent: 0, older: 0 } as Acc);
    acc.labels.set(label, (acc.labels.get(label) ?? 0) + 1);
    if (t.category) acc.categories.set(t.category, (acc.categories.get(t.category) ?? 0) + 1);
    acc.amounts.push(t.amount);
    acc.dates.push(t.date);
    if (t.date >= recentFrom) acc.recent += t.amount;
    else acc.older += t.amount;
    groups.set(key, acc);
  }

  const top = <K>(m: Map<K, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const habits: Habit[] = [];
  for (const g of groups.values()) {
    const count = g.amounts.length;
    // Em quantos blocos de 30 dias apareceu (precisa se repetir no tempo, não num dia só).
    const buckets = new Set(g.dates.map((d) => Math.min(2, Math.floor(daysBetween(d, last) / 30))));
    const distinctDays = new Set(g.dates).size;
    const avg = g.amounts.reduce((s, v) => s + v, 0) / count;
    const spread =
      Math.sqrt(g.amounts.reduce((s, v) => s + (v - avg) ** 2, 0) / count) / (avg || 1);

    const subscription = count >= 2 && count <= 4 && buckets.size >= 2 && spread < 0.08;
    const recurring = count >= 3 && distinctDays >= 3 && buckets.size >= 2;
    if (!subscription && !recurring) continue;

    const total = g.amounts.reduce((s, v) => s + v, 0);
    const monthly = total / 3;
    const olderMonthly = g.older / 2;
    const change = olderMonthly > 0 ? ((g.recent - olderMonthly) / olderMonthly) * 100 : null;

    let tag: HabitTag = null;
    if (subscription) tag = "subscription";
    else if (change !== null && change >= 25 && g.recent >= 30) tag = "rising";
    else if (avg <= 40 && count >= 6) tag = "small";

    habits.push({
      key: g.key,
      label: top(g.labels) ?? g.key,
      category: top(g.categories),
      count,
      perMonth: Math.round((count / 3) * 10) / 10,
      average: round2(avg),
      monthly: round2(monthly),
      yearly: round2(monthly * 12),
      tag,
      change: change === null ? null : Math.round(change),
    });
  }

  habits.sort((a, b) => b.monthly - a.monthly);
  const list = habits.slice(0, options.limit ?? 8);
  return {
    list,
    monthlyTotal: round2(list.reduce((s, h) => s + h.monthly, 0)),
    count: habits.length,
    since: from,
    until: last,
  };
}

/* ------------------------------------------------------------------ */
/* 5) O que mudou: últimos 30 dias x média dos 90 anteriores           */
/* ------------------------------------------------------------------ */

export type CategoryChange = {
  category: string;
  average: number; // média por 30 dias, nos 90 dias anteriores
  recent: number; // últimos 30 dias
  change: number | null; // %
  diff: number;
};

export function buildCategoryChanges(txs: RxTransaction[], today: string, limit = 6) {
  const last = lastDataDate(txs, today) ?? today;
  const recentFrom = shiftDate(last, -29);
  const baseFrom = shiftDate(recentFrom, -90);

  const recent = new Map<string, number>();
  const base = new Map<string, number>();
  let baseDays = 0;
  const first = txs.reduce<string | null>((m, t) => (!m || t.date < m ? t.date : m), null);
  if (first) baseDays = Math.max(0, Math.min(90, daysBetween(first < baseFrom ? baseFrom : first, recentFrom)));

  for (const t of txs) {
    if (!isSpend(t)) continue;
    const name = t.category ?? "Sem categoria";
    if (t.date >= recentFrom && t.date <= last) recent.set(name, (recent.get(name) ?? 0) + t.amount);
    else if (t.date >= baseFrom && t.date < recentFrom) base.set(name, (base.get(name) ?? 0) + t.amount);
  }

  // Precisa de pelo menos ~30 dias de histórico para comparar.
  if (baseDays < 28) return { list: [] as CategoryChange[], hasBase: false, top: null as CategoryChange | null };

  const names = new Set([...recent.keys(), ...base.keys()]);
  const list: CategoryChange[] = [];
  for (const name of names) {
    const average = ((base.get(name) ?? 0) / baseDays) * 30;
    const now = recent.get(name) ?? 0;
    if (average < 20 && now < 20) continue; // valores muito pequenos só fazem barulho
    list.push({
      category: name,
      average: round2(average),
      recent: round2(now),
      change: average > 0 ? Math.round(((now - average) / average) * 100) : null,
      diff: round2(now - average),
    });
  }
  list.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const rising = list
    .filter((c) => c.diff > 0 && c.average >= 30)
    .sort((a, b) => b.diff - a.diff)[0] ?? null;

  return { list: list.slice(0, limit), hasBase: true, top: rising };
}

/** Ritmo do mês: gasto até agora, projeção para o fim do mês e média dos 3 meses anteriores. */
export function buildMonthPace(txs: RxTransaction[], today: string) {
  const month = today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = lastDataDate(txs, today);
  const dayRef = last && last.slice(0, 7) === month ? Number(last.slice(8, 10)) : Number(today.slice(8, 10));

  const monthKey = (offset: number) => {
    const d = new Date(Date.UTC(y, m - 1 + offset, 1));
    return d.toISOString().slice(0, 7);
  };
  const totals = new Map<string, number>();
  for (const t of txs) if (isSpend(t)) totals.set(t.date.slice(0, 7), (totals.get(t.date.slice(0, 7)) ?? 0) + t.amount);

  const sofar = totals.get(month) ?? 0;
  const prev = [monthKey(-1), monthKey(-2), monthKey(-3)].map((k) => totals.get(k)).filter((v): v is number => !!v);
  const average = prev.length ? prev.reduce((s, v) => s + v, 0) / prev.length : null;
  const projected = dayRef > 0 ? (sofar / dayRef) * daysInMonth : sofar;

  return {
    sofar: round2(sofar),
    projected: round2(projected),
    average: average === null ? null : round2(average),
    daysLeft: Math.max(0, daysInMonth - Number(today.slice(8, 10))),
    vsAverage: average ? Math.round(((projected - average) / average) * 100) : null,
    dayRef,
    daysInMonth,
  };
}

/* ------------------------------------------------------------------ */
/* 6) Para onde vai cada R$ 100 (últimos 30 dias)                      */
/* ------------------------------------------------------------------ */

export type AllocationSlice = { key: string; label: string; amount: number; share: number; color: string };

const PERSONAL_SLICES: Record<string, { label: string; color: string }> = {
  essential: { label: "Essencial", color: "#4f46e5" },
  lifestyle: { label: "Estilo de vida", color: "#a855f7" },
  unclassified: { label: "Sem grupo definido", color: "#71717a" },
  debt: { label: "Dívidas e empréstimos", color: "#fb7185" },
  saved: { label: "Aportes e reservas", color: "#22d3ee" },
  left: { label: "Sobrou", color: "#34d399" },
};

const BUSINESS_SLICES: Record<string, { label: string; color: string }> = {
  variable: { label: "Custos variáveis", color: "#8b5cf6" },
  fixed: { label: "Custos fixos", color: "#4f46e5" },
  prolabore: { label: "Pró-labore", color: "#22d3ee" },
  tax: { label: "Impostos (DAS)", color: "#fbbf24" },
  unclassified: { label: "Sem classe de custo", color: "#71717a" },
  debt: { label: "Empréstimos", color: "#fb7185" },
  saved: { label: "Retiradas e aportes", color: "#f472b6" },
  left: { label: "Sobrou (lucro)", color: "#34d399" },
};

export function buildAllocation(txs: RxTransaction[], today: string, scope: RxScope) {
  const last = lastDataDate(txs, today) ?? today;
  const from = shiftDate(last, -29);
  const sums = new Map<string, number>();
  let income = 0;
  const add = (k: string, v: number) => sums.set(k, (sums.get(k) ?? 0) + v);

  for (const t of txs) {
    if (t.date < from || t.date > last) continue;
    if (t.type === "income") {
      if (countsAsResult(t.kind)) income += t.amount;
      continue;
    }
    if (t.kind === "loan") add("debt", t.amount);
    else if (t.kind === "contribution") add("saved", t.amount);
    else if (!countsAsResult(t.kind)) continue; // reembolso devolvido, pagamento de fatura
    else if (scope === "business") add(t.costClass ?? "unclassified", t.amount);
    else add(t.spendingGroup ?? "unclassified", t.amount);
  }

  const out = [...sums.values()].reduce((s, v) => s + v, 0);
  if (income > out) add("left", income - out);
  const base = Math.max(income, out);
  const legend = scope === "business" ? BUSINESS_SLICES : PERSONAL_SLICES;

  const slices: AllocationSlice[] = Object.keys(legend)
    .filter((k) => (sums.get(k) ?? 0) > 0)
    .map((k) => ({
      key: k,
      label: legend[k].label,
      color: legend[k].color,
      amount: round2(sums.get(k) ?? 0),
      share: base > 0 ? (sums.get(k) ?? 0) / base : 0,
    }));

  // Blocos (de 100) com arredondamento que sempre soma 100.
  const raw = slices.map((s) => s.share * 100);
  const blocks = raw.map(Math.floor);
  let rest = base > 0 ? 100 - blocks.reduce((s, v) => s + v, 0) : 0;
  raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
    .forEach(({ i }) => {
      if (rest > 0) {
        blocks[i]++;
        rest--;
      }
    });

  return {
    slices: slices.map((s, i) => ({ ...s, blocks: blocks[i] })),
    income: round2(income),
    out: round2(out),
    overspent: out > income && income > 0 ? round2(out - income) : 0,
    from,
    until: last,
  };
}

/* ------------------------------------------------------------------ */
/* 7) Agenda financeira dos próximos 7 dias                            */
/* ------------------------------------------------------------------ */

export type AgendaItem = {
  kind: "pay" | "receive" | "tax" | "card";
  title: string;
  amount: number;
  date: string;
  overdue?: boolean;
};

export type AgendaDay = { date: string; items: AgendaItem[]; balance: number };

/**
 * Coloca os itens no dia do vencimento (atrasados entram hoje) e calcula o
 * saldo previsto no fim de cada dia a partir do saldo atual das contas.
 */
export function buildAgenda(items: AgendaItem[], startBalance: number, today: string, days = 7) {
  const end = shiftDate(today, days - 1);
  const result: AgendaDay[] = [];
  let balance = startBalance;
  for (let i = 0; i < days; i++) {
    const date = shiftDate(today, i);
    const dayItems = items
      .filter((it) => (i === 0 ? it.date <= date : it.date === date))
      .map((it) => (it.date < today ? { ...it, overdue: true } : it))
      .sort((a, b) => (a.kind === "receive" ? -1 : 0) - (b.kind === "receive" ? -1 : 0));
    for (const it of dayItems) balance += it.kind === "receive" ? it.amount : -it.amount;
    result.push({ date, items: dayItems, balance: round2(balance) });
  }
  const inRange = items.filter((it) => it.date <= end);
  return {
    days: result,
    toPay: round2(inRange.filter((i) => i.kind !== "receive").reduce((s, i) => s + i.amount, 0)),
    toReceive: round2(inRange.filter((i) => i.kind === "receive").reduce((s, i) => s + i.amount, 0)),
    lowest: result.reduce((m, d) => (d.balance < m.balance ? d : m), result[0]),
  };
}
