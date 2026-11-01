export type PeriodKey = "all" | "today" | "7d" | "30d" | "90d" | "custom";

export type ReportPeriod = {
  key: PeriodKey;
  /** YYYY-MM-DD, inclusivo. null = sem limite inicial. */
  from: string | null;
  /** YYYY-MM-DD, inclusivo. null = sem limite final. */
  to: string | null;
};

export type ReportSearchParams = {
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

/** Data de hoje no fuso de Brasília (o servidor da Vercel roda em UTC). */
function todayInBrazil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function isValidDate(value: string | undefined): value is string {
  return !!value && DATE_RE.test(value) && shiftDate(value, 0) === value;
}

const ALL: ReportPeriod = { key: "all", from: null, to: null };

export function parsePeriod(params: ReportSearchParams = {}): ReportPeriod {
  const today = todayInBrazil();

  switch (first(params.period)) {
    case "today":
      return { key: "today", from: today, to: today };
    case "7d":
      return { key: "7d", from: shiftDate(today, -6), to: today };
    case "30d":
      return { key: "30d", from: shiftDate(today, -29), to: today };
    case "90d":
      return { key: "90d", from: shiftDate(today, -89), to: today };
    case "custom": {
      const from = first(params.from);
      const to = first(params.to);

      if (isValidDate(from) && isValidDate(to)) {
        return from <= to
          ? { key: "custom", from, to }
          : { key: "custom", from: to, to: from };
      }

      return ALL;
    }
    default:
      return ALL;
  }
}

/** Quantidade de dias do período (inclusivo). null se for ilimitado. */
export function spanDays(period: ReportPeriod): number | null {
  if (!period.from || !period.to) return null;

  const [y1, m1, d1] = period.from.split("-").map(Number);
  const [y2, m2, d2] = period.to.split("-").map(Number);
  const diff = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1);

  return Math.round(diff / 86_400_000) + 1;
}
