import Link from "next/link";

import { brl } from "@/components/business/format";
import { WEEKDAYS_SHORT, weekdayIndex, type AgendaItem } from "@/lib/raio-x-calc";
import type { RaioXData } from "@/lib/raio-x";
import { cn } from "@/lib/utils";

import { RxCard } from "./rx-card";

const KIND: Record<AgendaItem["kind"], { label: string; className: string; dot: string }> = {
  pay: { label: "pagar", className: "border-l-danger bg-danger/10", dot: "bg-danger" },
  receive: { label: "receber", className: "border-l-success bg-success/10", dot: "bg-success" },
  card: { label: "fatura do cartão", className: "border-l-warning bg-warning/10", dot: "bg-warning" },
  tax: { label: "imposto", className: "border-l-brand-bright bg-brand/15", dot: "bg-brand-bright" },
};

export function AgendaCard({
  agenda,
  today,
  hasAccounts,
}: {
  agenda: RaioXData["agenda"];
  today: string;
  hasAccounts: boolean;
}) {
  const empty = agenda.days.every((d) => d.items.length === 0);

  return (
    <RxCard
      title="Agenda financeira da semana"
      description={
        hasAccounts
          ? "O que vence nos próximos 7 dias e o saldo previsto no fim de cada dia (atrasadas entram hoje)"
          : "O que vence nos próximos 7 dias (atrasadas entram hoje)"
      }
    >
      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-faint">
        {Object.values(KIND).map((k) => (
          <span key={k.label} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", k.dot)} />
            {k.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[700px] grid-cols-7 gap-2">
          {agenda.days.map((day) => {
            const isToday = day.date === today;
            return (
              <div
                key={day.date}
                className={cn(
                  "flex min-h-52 flex-col rounded-2xl border bg-tint p-2.5",
                  isToday ? "border-brand/60" : "border-line"
                )}
              >
                <p className="text-[10.5px] text-faint">
                  {WEEKDAYS_SHORT[weekdayIndex(day.date)]}
                  {isToday && " · hoje"}
                </p>
                <p className="mb-2 text-lg font-bold text-foreground">{Number(day.date.slice(8, 10))}</p>

                <div className="flex-1 space-y-1.5">
                  {day.items.length === 0 && <p className="text-[11px] text-faint">Nada vence</p>}
                  {day.items.map((item, i) => (
                    <div
                      key={`${item.title}-${i}`}
                      title={`${item.title} · ${brl(item.amount)}`}
                      className={cn("rounded-lg border-l-[3px] px-2 py-1.5 text-[11px] leading-tight", KIND[item.kind].className)}
                    >
                      <b className="line-clamp-2 font-semibold text-foreground">{item.title}</b>
                      <span className="text-muted-foreground">
                        {brl(item.amount)}
                        {item.overdue && <span className="font-semibold text-danger"> · atrasada</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {hasAccounts && (
                  <p className="mt-2 border-t border-dashed border-line-strong pt-1.5 text-[11px] text-muted-foreground">
                    Saldo{" "}
                    <b className={cn("tabular-nums", day.balance < 0 ? "text-danger" : "text-foreground")}>
                      {brl(day.balance)}
                    </b>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Na semana: a pagar <b className="text-foreground">{brl(agenda.toPay)}</b> · a receber{" "}
          <b className="text-foreground">{brl(agenda.toReceive)}</b>
        </span>
        {empty && (
          <Link href="/contas-a-pagar-receber" className="inline-flex min-h-6 items-center font-medium text-brand-soft hover:underline">
            Cadastrar contas a pagar e receber
          </Link>
        )}
      </div>
    </RxCard>
  );
}
