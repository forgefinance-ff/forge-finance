/**
 * Regras de cálculo do MEI usadas no servidor e na tela.
 * Nenhum valor de imposto ou limite fica aqui: tudo vem das configurações
 * que o próprio usuário preenche.
 */

export type MeiActivity = "servicos" | "comercio" | "ambos";

export type MeiSettings = {
  activity: MeiActivity;
  das_due_day: number;
  annual_limit: number | null;
  das_amount: number | null;
  opening_date: string | null;
  dasn_due_date: string | null;
};

export type DasPayment = {
  id: string;
  competence: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  paid_at: string | null;
};

export const ACTIVITY_LABEL: Record<MeiActivity, string> = {
  servicos: "Serviços",
  comercio: "Comércio / indústria",
  ambos: "Comércio e serviços",
};

export const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function lastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "2026-10-01" -> "out/2026" */
export function competenceLabel(competence: string) {
  const [y, m] = competence.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]}/${y}`;
}

/**
 * Vencimento sugerido do DAS de uma competência: o dia configurado do mês
 * seguinte (ajustado para o último dia, se o mês for mais curto).
 * O usuário pode alterar a data ao gerar a guia.
 */
export function suggestedDasDueDate(competence: string, dueDay: number) {
  const [y, m] = competence.split("-").map(Number);
  const year = m === 12 ? y + 1 : y;
  const month = m === 12 ? 1 : m + 1;
  return `${year}-${pad(month)}-${pad(Math.min(dueDay, lastDay(year, month)))}`;
}

export type LimitCalc = {
  year: number;
  revenue: number;
  /** Limite que vale para o ano (proporcional se abriu neste ano). null = não informado. */
  limit: number | null;
  proportional: null | { annualLimit: number; months: number; openingMonth: number };
  percent: number | null;
  remaining: number | null;
  /** Meses do ano já em atividade (até o mês atual). */
  monthsElapsed: number;
  /** Meses de atividade no ano inteiro (12, ou menos se abriu neste ano). */
  monthsInYear: number;
  monthlyAverage: number;
  projection: number;
  level: "ok" | "warning" | "danger";
};

/**
 * Faturamento acumulado x limite. Se a data de abertura for deste ano, o
 * limite é proporcional: (limite anual ÷ 12) × meses de atividade, contando o
 * mês de abertura como mês inteiro. A conta é mostrada na tela.
 */
export function calcLimit(settings: MeiSettings | null, revenue: number, today: string): LimitCalc {
  const [year, currentMonth] = today.split("-").map(Number);
  const annual = settings?.annual_limit ?? null;

  let openingMonth = 1;
  if (settings?.opening_date) {
    const [oy, om] = settings.opening_date.split("-").map(Number);
    if (oy === year) openingMonth = om;
    if (oy > year) openingMonth = 13;
  }

  const monthsInYear = Math.max(0, 12 - openingMonth + 1);
  const monthsElapsed = Math.max(0, currentMonth - openingMonth + 1);

  const proportional =
    annual !== null && openingMonth > 1 && openingMonth <= 12
      ? { annualLimit: annual, months: monthsInYear, openingMonth }
      : null;

  const limit =
    annual === null
      ? null
      : proportional
        ? Math.round((annual / 12) * monthsInYear * 100) / 100
        : annual;

  const monthlyAverage = monthsElapsed > 0 ? revenue / monthsElapsed : 0;
  const projection = monthlyAverage * monthsInYear;
  const percent = limit ? (revenue / limit) * 100 : null;

  return {
    year,
    revenue,
    limit,
    proportional,
    percent,
    remaining: limit === null ? null : limit - revenue,
    monthsElapsed,
    monthsInYear,
    monthlyAverage,
    projection,
    level: percent === null ? "ok" : percent >= 100 ? "danger" : percent >= 80 ? "warning" : "ok",
  };
}

/** Competência (primeiro dia) do mês anterior ao de `today`: é o DAS que vence neste mês. */
export function previousCompetence(today: string) {
  const [y, m] = today.split("-").map(Number);
  return m === 1 ? `${y - 1}-12-01` : `${y}-${pad(m - 1)}-01`;
}

/** Competência não pode ser anterior ao mês de abertura. */
export function isBeforeOpening(competence: string, openingDate: string | null) {
  return !!openingDate && competence < `${openingDate.slice(0, 7)}-01`;
}
