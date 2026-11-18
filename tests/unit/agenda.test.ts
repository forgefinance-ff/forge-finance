import { test } from "node:test";
import assert from "node:assert/strict";

import {
  addDays,
  addMonths,
  localToUtcIso,
  tzOffsetMinutes,
  utcToLocal,
  weekday,
} from "../../lib/agenda/time.ts";
import { buildDayTotals, monthGrid, rangeTitle, stepDate, viewRange, type AgendaEvent, type FinancialItem } from "../../lib/agenda/shared.ts";
import { eventDays, eventsByDay, isAllDayLike, layoutDay, segmentForDay } from "../../lib/agenda/layout.ts";

function ev(id: string, start: string, end: string, allDay = false): AgendaEvent {
  return {
    id,
    calendarId: "c",
    scope: "personal",
    kind: "event",
    title: id,
    description: null,
    location: null,
    meetingUrl: null,
    color: null,
    allDay,
    start,
    end,
    taskDone: false,
    attendees: [],
  };
}

test("fuso de São Paulo: -03:00 e conversão ida e volta", () => {
  assert.equal(tzOffsetMinutes(Date.parse("2026-11-18T12:00:00Z")), -180);
  assert.equal(localToUtcIso("2026-11-18", "15:30"), "2026-11-18T18:30:00.000Z");
  assert.deepEqual(utcToLocal("2026-11-18T18:30:00.000Z"), { date: "2026-11-18", time: "15:30", minutes: 930 });
  // 23h em São Paulo já é o dia seguinte em UTC
  assert.equal(localToUtcIso("2026-12-31", "23:00"), "2027-01-01T02:00:00.000Z");
  assert.equal(utcToLocal("2027-01-01T02:00:00.000Z").date, "2026-12-31");
});

test("fuso com horário de verão (Nova York) acerta a virada", () => {
  assert.equal(localToUtcIso("2026-07-01", "09:00", "America/New_York"), "2026-07-01T13:00:00.000Z");
  assert.equal(localToUtcIso("2026-01-15", "09:00", "America/New_York"), "2026-01-15T14:00:00.000Z");
});

test("datas: dia 31 em mês curto e ano bissexto", () => {
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(weekday("2026-11-18"), 3); // quarta
});

test("visões: semana começa no domingo, mês tem sempre 6 semanas", () => {
  assert.deepEqual(viewRange("semana", "2026-11-18"), { start: "2026-11-15", end: "2026-11-22" });
  const mes = viewRange("mes", "2026-11-18");
  assert.equal(mes.start, "2026-11-01"); // 1º de novembro de 2026 é domingo
  assert.equal(mes.end, "2026-12-13");
  assert.equal(monthGrid("2026-08-10").length, 42);
  assert.equal(stepDate("mes", "2026-01-31", 1), "2026-02-01");
  assert.equal(rangeTitle("mes", "2026-11-18"), "novembro de 2026");
  assert.equal(rangeTitle("semana", "2026-11-18"), "15 – 21 de novembro de 2026");
});

test("evento que atravessa a meia-noite vira dois pedaços", () => {
  const e = ev("festa", localToUtcIso("2026-11-20", "22:00"), localToUtcIso("2026-11-21", "02:00"));
  assert.deepEqual(eventDays(e), ["2026-11-20", "2026-11-21"]);
  const a = segmentForDay(e, "2026-11-20");
  const b = segmentForDay(e, "2026-11-21");
  assert.equal(a?.startMin, 1320);
  assert.equal(a?.endMin, 1440);
  assert.equal(a?.continuesAfter, true);
  assert.equal(b?.startMin, 0);
  assert.equal(b?.endMin, 120);
  assert.equal(b?.continuesBefore, true);
  assert.equal(b?.continuesAfter, false);
});

test("evento que termina à meia-noite não aparece no dia seguinte", () => {
  const e = ev("jantar", localToUtcIso("2026-11-20", "20:00"), localToUtcIso("2026-11-21", "00:00"));
  assert.deepEqual(eventDays(e), ["2026-11-20"]);
  assert.equal(segmentForDay(e, "2026-11-21"), null);
});

test("dia inteiro de 2 dias ocupa os dois dias", () => {
  const e = ev("viagem", localToUtcIso("2026-11-20"), localToUtcIso("2026-11-22"), true);
  assert.equal(isAllDayLike(e), true);
  assert.deepEqual(eventDays(e), ["2026-11-20", "2026-11-21"]);
  const map = eventsByDay([e], "2026-11-15", "2026-11-22");
  assert.deepEqual(Object.keys(map).sort(), ["2026-11-20", "2026-11-21"]);
});

test("sobrepostos ficam lado a lado; separados ocupam a largura toda", () => {
  const day = "2026-11-18";
  const e1 = ev("a", localToUtcIso(day, "09:00"), localToUtcIso(day, "10:00"));
  const e2 = ev("b", localToUtcIso(day, "09:30"), localToUtcIso(day, "11:00"));
  const e3 = ev("c", localToUtcIso(day, "10:00"), localToUtcIso(day, "10:30"));
  const e4 = ev("d", localToUtcIso(day, "14:00"), localToUtcIso(day, "15:00"));
  const placed = layoutDay([e1, e2, e3, e4].map((e) => segmentForDay(e, day)!));
  const by = Object.fromEntries(placed.map((p) => [p.event.id, p]));
  assert.equal(by.a.columns, 2);
  assert.equal(by.b.columns, 2);
  assert.notEqual(by.a.column, by.b.column);
  assert.equal(by.c.column, by.a.column); // reaproveita a coluna livre às 10h
  assert.equal(by.d.columns, 1);
  assert.equal(by.d.column, 0);
});

test("totais do dia: realizado até hoje, previsto depois", () => {
  const items: FinancialItem[] = [
    { id: "p1", source: "payable", kind: "pay", scope: "personal", title: "Aluguel", amount: 1200, date: "2026-11-20", status: "pending", customer: null, payableId: "1", href: "" },
    { id: "p2", source: "payable", kind: "receive", scope: "business", title: "Cliente", amount: 300, date: "2026-11-20", status: "pending", customer: "Ana", payableId: "2", href: "" },
    { id: "p3", source: "payable", kind: "pay", scope: "personal", title: "Pago", amount: 99, date: "2026-11-21", status: "paid", customer: null, payableId: "3", href: "" },
    { id: "p4", source: "payable", kind: "pay", scope: "personal", title: "Ontem", amount: 50, date: "2026-11-17", status: "overdue", customer: null, payableId: "4", href: "" },
  ];
  const totals = buildDayTotals("2026-11-17", "2026-11-22", "2026-11-18", [{ day: "2026-11-17", income: 10, expense: 20 }], items);
  assert.deepEqual(totals["2026-11-17"], { income: 10, expense: 20, projected: false });
  assert.deepEqual(totals["2026-11-20"], { income: 300, expense: 1200, projected: true });
  assert.deepEqual(totals["2026-11-21"], { income: 0, expense: 0, projected: true });
});
