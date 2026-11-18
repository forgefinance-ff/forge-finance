/**
 * Encaixe dos eventos na tela (puro, testável no Node).
 * - Evento que atravessa a meia-noite vira um pedaço por dia.
 * - Eventos sobrepostos ficam lado a lado, como no Google Agenda.
 */

import { addDays, utcToLocal, AGENDA_TZ } from "./time.ts";
import type { AgendaEvent } from "./shared.ts";

export type DaySegment = {
  event: AgendaEvent;
  /** Minutos desde 00:00 do dia (0–1440). */
  startMin: number;
  endMin: number;
  /** Continua de ontem / segue amanhã. */
  continuesBefore: boolean;
  continuesAfter: boolean;
};

export type PlacedSegment = DaySegment & { column: number; columns: number };

/** Datas locais (AAAA-MM-DD) que o evento ocupa. Fim exclusivo. */
export function eventDays(event: Pick<AgendaEvent, "start" | "end" | "allDay">, tz: string = AGENDA_TZ): string[] {
  const s = utcToLocal(event.start, tz);
  const e = utcToLocal(event.end, tz);
  let last = e.date;
  // Termina exatamente à meia-noite (ou é de dia inteiro): o último dia é o anterior.
  if (e.minutes === 0 && event.end > event.start) last = addDays(e.date, -1);
  if (last < s.date) last = s.date;
  const days: string[] = [];
  for (let d = s.date; d <= last && days.length < 400; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Evento sem horário na grade: dia inteiro ou com 24 h ou mais. */
export function isAllDayLike(event: Pick<AgendaEvent, "start" | "end" | "allDay">): boolean {
  if (event.allDay) return true;
  return Date.parse(event.end) - Date.parse(event.start) >= 24 * 60 * 60 * 1000;
}

/** Pedaço de um evento com horário dentro do dia. */
export function segmentForDay(event: AgendaEvent, day: string, tz: string = AGENDA_TZ): DaySegment | null {
  const s = utcToLocal(event.start, tz);
  const e = utcToLocal(event.end, tz);
  if (day < s.date || day > e.date) return null;
  const startMin = day === s.date ? s.minutes : 0;
  const endMin = day === e.date ? e.minutes : 1440;
  // Fim à meia-noite: nada a desenhar neste dia (exceto evento de duração zero).
  if (endMin <= startMin && !(startMin === endMin && event.start === event.end)) return null;
  return {
    event,
    startMin,
    endMin: Math.max(endMin, startMin),
    continuesBefore: day > s.date,
    continuesAfter: day < (e.minutes === 0 ? addDays(e.date, -1) : e.date),
  };
}

/** Altura mínima visual (minutos) para não sumir evento curto. */
export const MIN_VISUAL_MINUTES = 20;

/**
 * Lado a lado: agrupa os que se sobrepõem e dá a cada um a primeira coluna
 * livre do grupo. Todos do grupo dividem a largura igualmente.
 */
export function layoutDay(segments: DaySegment[]): PlacedSegment[] {
  const sorted = [...segments].sort(
    (a, b) => a.startMin - b.startMin || b.endMin - b.startMin - (a.endMin - a.startMin) || a.event.title.localeCompare(b.event.title)
  );
  const placed: PlacedSegment[] = [];
  let cluster: PlacedSegment[] = [];
  let clusterEnd = -1;
  let columnEnds: number[] = [];

  const flush = () => {
    const columns = Math.max(1, columnEnds.length);
    for (const seg of cluster) seg.columns = columns;
    placed.push(...cluster);
    cluster = [];
    columnEnds = [];
  };

  for (const seg of sorted) {
    const visualEnd = Math.max(seg.endMin, seg.startMin + MIN_VISUAL_MINUTES);
    if (cluster.length > 0 && seg.startMin >= clusterEnd) flush();
    let column = columnEnds.findIndex((end) => end <= seg.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(visualEnd);
    } else {
      columnEnds[column] = visualEnd;
    }
    cluster.push({ ...seg, column, columns: 1 });
    clusterEnd = cluster.length === 1 ? visualEnd : Math.max(clusterEnd, visualEnd);
  }
  if (cluster.length > 0) flush();
  return placed;
}

/** Eventos por dia para a grade do mês e a lista (ordem: dia inteiro, depois horário). */
export function eventsByDay(events: AgendaEvent[], start: string, end: string, tz: string = AGENDA_TZ) {
  const map: Record<string, AgendaEvent[]> = {};
  for (const event of events) {
    for (const day of eventDays(event, tz)) {
      if (day < start || day >= end) continue;
      (map[day] ??= []).push(event);
    }
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => {
      const aa = isAllDayLike(a) ? 0 : 1;
      const bb = isAllDayLike(b) ? 0 : 1;
      return aa - bb || a.start.localeCompare(b.start) || a.title.localeCompare(b.title);
    });
  }
  return map;
}
