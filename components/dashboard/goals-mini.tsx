"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { LearnChevron, PopNumber, SoftText } from "@/components/motion";
import { formatCurrency } from "@/lib/formatters";
import type { Goal } from "@/lib/goals";
import { cn } from "@/lib/utils";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function deadlineLabel(deadline: string | null, done: boolean) {
  if (done) return "Meta batida";
  if (!deadline) return "Sem prazo";
  const [y, m, d] = deadline.split("-").map(Number);
  const today = new Date();
  const end = new Date(y, m - 1, d || 1);
  if (end < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return "Prazo vencido";
  return `Até ${MONTHS[m - 1]}/${String(y).slice(2)}`;
}

const SIZE = 176;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * Metas num carrossel: um anel grande por vez, preenchendo a partir do topo
 * para a esquerda. Ao trocar de meta o mesmo anel corre até a nova
 * porcentagem; setas, bolinhas ou arrastar para os lados alternam.
 */
export function GoalsMini({ goals }: { goals: Goal[] }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const startX = useRef<number | null>(null);
  const count = goals.length;

  function go(next: number) {
    if (count < 2) return;
    const target = (next + count) % count;
    setDir(next > index ? 1 : -1);
    setIndex(target);
  }

  if (count === 0) {
    return (
      <section className="forge-panel flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="forge-panel-title">Metas</h2>
          <Link href="/metas" className="t-learn inline-flex min-h-6 items-center gap-0.5 text-sm font-medium text-brand">
            Criar meta
            <LearnChevron />
          </Link>
        </div>
        <div className="mt-4 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-faint">
          Uma meta ajuda a guardar com propósito: viagem, reserva, um carro.
        </div>
      </section>
    );
  }

  const goal = goals[Math.min(index, count - 1)];
  const pct = goal.target_amount > 0 ? Math.min(goal.current_amount / goal.target_amount, 1) : 0;
  const done = pct >= 1;
  const label = deadlineLabel(goal.deadline, done);
  const late = label === "Prazo vencido";
  const color = done ? "var(--success)" : late ? "var(--danger)" : "var(--brand)";

  return (
    <section
      className="forge-panel flex h-full flex-col p-5 sm:p-6"
      aria-roledescription="carrossel"
      aria-label="Metas"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="forge-panel-title">
          Metas
          {count > 1 && (
            <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
              {index + 1} de {count}
            </span>
          )}
        </h2>
        <Link href="/metas" className="t-learn inline-flex min-h-6 items-center gap-0.5 text-sm font-medium text-brand">
          Ver todas
          <LearnChevron />
        </Link>
      </div>

      <div
        className="relative flex flex-1 touch-pan-y flex-col items-center justify-center pt-4 text-center"
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Meta anterior"
              className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-solid text-text-soft transition-colors hover:border-line-strong hover:text-foreground"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Próxima meta"
              className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface-solid text-text-soft transition-colors hover:border-line-strong hover:text-foreground"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </>
        )}

        {/* O mesmo anel corre de uma meta para a outra. Espelhado: começa no topo e enche para a esquerda. */}
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -scale-x-100 rotate-90" aria-hidden>
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--tint-strong)" strokeWidth={STROKE} />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
              opacity={pct > 0 ? 1 : 0}
              className="goal-ring-arc t-ring-arc"
              style={{ "--ring-c": `${C}`, animationDelay: "150ms" } as React.CSSProperties}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-[34px] font-normal leading-none tracking-[-0.04em] text-foreground tabular-nums">
              <PopNumber value={`${Math.round(pct * 100)}%`} startDelay={120} />
            </span>
            <span className={cn("mt-1 text-[11px] font-medium", done ? "text-success" : late ? "text-danger" : "text-muted-foreground")}>
              <SoftText text={label} />
            </span>
          </div>
        </div>

        <div key={goal.id} className={cn("goal-slide-in", dir < 0 && "goal-slide-in--back")} aria-live="polite">
          <p className="mt-3 max-w-[240px] truncate text-sm font-medium text-foreground">{goal.title}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {formatCurrency(goal.current_amount)} de {formatCurrency(goal.target_amount)}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-faint">
            {done ? "Parabéns, meta batida!" : `Faltam ${formatCurrency(Math.max(goal.target_amount - goal.current_amount, 0))}`}
          </p>
        </div>
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center" role="tablist" aria-label="Escolher meta">
          {goals.map((g, i) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={g.title}
              onClick={() => go(i)}
              className="group flex h-6 min-w-6 items-center justify-center"
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  i === index ? "w-6 bg-text" : "w-1.5 bg-line-strong group-hover:bg-text-muted"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
