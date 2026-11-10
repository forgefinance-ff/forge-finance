import { brl } from "@/components/business/format";
import { formatDateBR } from "@/lib/dates";
import { WEEKDAYS_SHORT, type CalendarDay } from "@/lib/raio-x-calc";
import type { RaioXData } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

import { RxCard, RxInsight } from "./rx-card";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const LEVEL_CLASS: Record<CalendarDay["level"], string> = {
  0: "bg-tint-strong",
  1: "bg-brand/25",
  2: "bg-brand/50",
  3: "bg-brand/80",
  4: "bg-brand-soft",
};

function dayTitle(day: CalendarDay) {
  const parts = [formatDateBR(day.date)];
  if (day.future) parts.push("ainda não chegou");
  else if (day.noData) parts.push("sem lançamentos ainda");
  else parts.push(day.spent > 0 ? `Saídas: ${brl(day.spent)}` : "Sem gastos");
  if (day.received > 0) parts.push(`Entradas: ${brl(day.received)}`);
  if (day.due > 0) parts.push(`${day.due} ${day.due === 1 ? "vencimento" : "vencimentos"}`);
  return parts.join(" · ");
}

export function SpendCalendar({ calendar }: { calendar: RaioXData["calendar"] }) {
  const { weeks, peakDays, peakShare } = calendar;

  return (
    <RxCard
      title="Calendário de gastos"
      description="Últimas 13 semanas. Cada quadrado é um dia: quanto mais forte, mais saiu. Ponto verde = dia com entrada."
      badge="Saídas"
    >
      {/* rtl no contêiner: no celular a rolagem começa nas semanas mais recentes */}
      <div className="overflow-x-auto pb-1 [direction:rtl]">
        <div className="min-w-[520px] [direction:ltr]">
          {/* meses */}
          <div className="ml-9 grid grid-cols-13 gap-1.5 text-[11px] text-muted-foreground">
            {weeks.map((week, i) => {
              const monthStart = week.find((d) => d.date.slice(8, 10) === "01");
              const ref = i === 0 ? week[0] : monthStart;
              return (
                <span key={week[0].date} className="h-4 truncate">
                  {ref ? MONTHS[Number(ref.date.slice(5, 7)) - 1] : ""}
                </span>
              );
            })}
          </div>

          <div className="mt-1 flex gap-1.5">
            <div className="flex w-7.5 shrink-0 flex-col gap-1.5 text-[10px] text-faint">
              {WEEKDAYS_SHORT.map((d, i) => (
                <span key={d} className="flex h-5 items-center">
                  {i % 2 === 0 ? d : ""}
                </span>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-13 gap-1.5">
              {weeks.map((week) => (
                <div key={week[0].date} className="flex flex-col gap-1.5">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={dayTitle(day)}
                      className={cn(
                        "relative h-5 rounded-[5px]",
                        day.future || day.noData ? "bg-transparent outline outline-1 -outline-offset-1 outline-line" : LEVEL_CLASS[day.level],
                        day.due > 0 && "ring-[1.5px] ring-warning ring-inset"
                      )}
                    >
                      {day.received > 0 && (
                        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-success" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-faint">
        <div className="flex items-center gap-1.5">
          Menos
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={cn("h-3 w-3 rounded-[3px]", LEVEL_CLASS[l])} />
          ))}
          Mais
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" /> entrada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px] ring-[1.5px] ring-warning ring-inset" /> vencimento
          </span>
        </div>
      </div>

      {peakDays.length === 2 && peakShare >= 0.2 && (
        <RxInsight>
          Os dias <b className="text-foreground">{peakDays[0]} e {peakDays[1]}</b> de cada mês concentram{" "}
          <b className="text-foreground">{Math.round(peakShare * 100)}%</b> das saídas destas 13 semanas.
          Vale deixar dinheiro separado antes dessas datas.
        </RxInsight>
      )}
    </RxCard>
  );
}
