/**
 * Datas da Agenda. Funções puras (servidor e navegador).
 * O banco guarda UTC; a tela mostra no fuso do usuário (padrão America/Sao_Paulo).
 * Datas locais são texto "AAAA-MM-DD" e horas "HH:MM", sem passar por Date local.
 */

export const AGENDA_TZ = "America/Sao_Paulo";

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string) {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsCache.set(tz, f);
  }
  return f;
}

/** Diferença (minutos) entre o relógio do fuso e o UTC naquele instante. */
export function tzOffsetMinutes(utcMs: number, tz: string = AGENDA_TZ): number {
  const parts = formatter(tz).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

/** "2026-11-18" + "15:30" no fuso -> instante UTC (ms). */
export function localToUtcMs(date: string, time: string = "00:00", tz: string = AGENDA_TZ): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let result = guess - tzOffsetMinutes(guess, tz) * 60000;
  // Segunda passada: acerta a virada de horário de verão, se o fuso tiver.
  const second = guess - tzOffsetMinutes(result, tz) * 60000;
  if (second !== result) result = second;
  return result;
}

export function localToUtcIso(date: string, time: string = "00:00", tz: string = AGENDA_TZ): string {
  return new Date(localToUtcMs(date, time, tz)).toISOString();
}

export type LocalParts = { date: string; time: string; minutes: number };

/** Instante UTC -> data, hora e minutos do dia no fuso. */
export function utcToLocal(value: string | number, tz: string = AGENDA_TZ): LocalParts {
  const ms = typeof value === "number" ? value : Date.parse(value);
  const local = new Date(ms + tzOffsetMinutes(ms, tz) * 60000);
  const date = local.toISOString().slice(0, 10);
  const hours = local.getUTCHours();
  const minutes = local.getUTCMinutes();
  return {
    date,
    time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    minutes: hours * 60 + minutes,
  };
}

/** Hoje no fuso (AAAA-MM-DD). */
export function todayLocal(tz: string = AGENDA_TZ, now: number = Date.now()): string {
  return utcToLocal(now, tz).date;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

export function addYears(date: string, years: number): string {
  return addMonths(date, years * 12);
}

/** 0 = domingo ... 6 = sábado. */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function diffDays(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
}

export function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function minutesToTime(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const WEEKDAY_LONG = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
export const MONTH_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-11-18" -> "18 de novembro de 2026" */
export function longDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${d} de ${MONTH_LONG[m - 1]} de ${y}`;
}

/** "2026-11-18" -> "qua, 18 nov" */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${WEEKDAY_SHORT[weekday(date)]}, ${d} ${MONTH_SHORT[m - 1]}`;
}
