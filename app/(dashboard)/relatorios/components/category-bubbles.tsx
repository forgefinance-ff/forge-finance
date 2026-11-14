"use client";

import { useState } from "react";
import { ArrowUpRightIcon, ChevronDownIcon } from "lucide-react";

import type { CategoryExpense } from "../data/category-expenses";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pctLabel = (p: number) =>
  `${p.toLocaleString("pt-BR", { maximumFractionDigits: p >= 10 ? 0 : p >= 1 ? 1 : 2 })}%`;

/* Cores das bolhas, da maior para a menor (paleta do Forge + um acento). */
const BUBBLE_COLORS = [
  { bg: "oklch(34% 0.13 292)", fg: "#fff" },
  { bg: "oklch(52% 0.2 292)", fg: "#fff" },
  { bg: "oklch(70% 0.07 292)", fg: "#fff" },
  { bg: "oklch(78% 0.16 125)", fg: "oklch(25% 0.06 125)" },
];

type Circle = { x: number; y: number; r: number };

/**
 * Encosta as bolhas umas nas outras sem sobrepor (empacotamento simples):
 * a maior no centro; cada próxima tangente a duas já colocadas, o mais perto
 * possível do conjunto. Depois tudo é escalado para caber no quadro.
 */
function packCircles(radii: number[], boxW: number, boxH: number): Circle[] {
  const gap = radii[0] * 0.04;
  const placed: Circle[] = [];
  const fits = (c: Circle) => placed.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= p.r + c.r + gap - 1e-6);

  radii.forEach((r, i) => {
    if (i === 0) return placed.push({ x: 0, y: 0, r });
    if (i === 1) {
      const a = (-35 * Math.PI) / 180;
      const d = placed[0].r + r + gap;
      return placed.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r });
    }
    const cx = placed.reduce((s, p) => s + p.x * p.r, 0) / placed.reduce((s, p) => s + p.r, 0);
    const cy = placed.reduce((s, p) => s + p.y * p.r, 0) / placed.reduce((s, p) => s + p.r, 0);
    let best: Circle | null = null;
    let bestD = Infinity;
    for (let m = 0; m < placed.length; m++) {
      for (let k = m + 1; k < placed.length; k++) {
        const A = placed[m];
        const B = placed[k];
        const da = A.r + r + gap;
        const db = B.r + r + gap;
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const d = Math.hypot(dx, dy);
        if (d > da + db || d < Math.abs(da - db) || d === 0) continue;
        const l = (da * da - db * db + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, da * da - l * l));
        const mx = A.x + (dx * l) / d;
        const my = A.y + (dy * l) / d;
        for (const sign of [1, -1]) {
          const c = { x: mx + (sign * -dy * h) / d, y: my + (sign * dx * h) / d, r };
          const dist = Math.hypot(c.x - cx, c.y - cy);
          if (fits(c) && dist < bestD) {
            best = c;
            bestD = dist;
          }
        }
      }
    }
    placed.push(best ?? { x: placed[0].r + r + gap, y: placed[0].r, r });
  });

  // Escala para caber no quadro (com uma margem) e centraliza.
  const minX = Math.min(...placed.map((c) => c.x - c.r));
  const maxX = Math.max(...placed.map((c) => c.x + c.r));
  const minY = Math.min(...placed.map((c) => c.y - c.r));
  const maxY = Math.max(...placed.map((c) => c.y + c.r));
  const scale = Math.min((boxW * 0.94) / (maxX - minX), (boxH * 0.94) / (maxY - minY));
  const offX = (boxW - (maxX - minX) * scale) / 2 - minX * scale;
  const offY = (boxH - (maxY - minY) * scale) / 2 - minY * scale;
  return placed.map((c) => ({ x: c.x * scale + offX, y: c.y * scale + offY, r: c.r * scale }));
}

const BOX_W = 135;
const BOX_H = 100;

/** Despesas por categoria: as 4 maiores em bolhas, o resto em lista. */
export function CategoryBubbles({ data }: { data: CategoryExpense[] }) {
  const [showAll, setShowAll] = useState(false);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const top = data.slice(0, 4);
  const rest = data.slice(4);
  const visibleRest = showAll ? rest : rest.slice(0, 4);
  const max = top[0]?.value ?? 1;
  // Área proporcional ao valor, com um mínimo para o texto caber nas pequenas.
  const circles = packCircles(
    top.map((item) => Math.max(Math.sqrt(item.value / max), 0.34)),
    BOX_W,
    BOX_H
  );

  return (
    <section className="forge-panel p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium tracking-[-0.02em] text-foreground">Despesas por categoria</h2>
        {total > 0 && <span className="text-sm text-muted-foreground">Total {brl(total)}</span>}
      </div>

      {total === 0 ? (
        <div className="mt-5 flex h-56 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-faint">
          Nenhuma despesa no período.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
          {/* Bolhas: área proporcional ao valor */}
          <div className="relative mx-auto aspect-[1.35] w-full max-w-[460px] [container-type:inline-size]" role="list" aria-label="Maiores categorias">
            {top.map((item, i) => {
              const pct = (item.value / total) * 100;
              const c = circles[i];
              const size = ((c.r * 2) / BOX_W) * 100; // % da largura
              const color = BUBBLE_COLORS[i];
              return (
                <div
                  key={item.name}
                  role="listitem"
                  title={`${item.name}: ${brl(item.value)}`}
                  className="cb-bubble absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center ring-[3px] ring-[var(--surface-solid)]"
                  style={
                    {
                      left: `${(c.x / BOX_W) * 100}%`,
                      top: `${(c.y / BOX_H) * 100}%`,
                      width: `${size}%`,
                      background: color.bg,
                      color: color.fg,
                      zIndex: 10 - i,
                      "--i": i,
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="font-[family-name:var(--font-display)] font-medium leading-none tracking-[-0.03em]"
                    style={{ fontSize: `clamp(12px, ${(size * 0.13).toFixed(2)}cqw, 40px)` }}
                  >
                    {pctLabel(pct)}
                  </span>
                  <span
                    className="mt-1 max-w-[85%] truncate opacity-85"
                    style={{ fontSize: `clamp(9px, ${(size * 0.05).toFixed(2)}cqw, 14px)` }}
                  >
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Outras categorias */}
          <div>
            <h3 className="text-base font-medium text-foreground">
              {rest.length ? "Outras categorias" : "Categorias"}
            </h3>
            <ul className="mt-3 space-y-1">
              {(rest.length ? visibleRest : top).map((item, i) => {
                const pct = (item.value / total) * 100;
                return (
                  <li
                    key={item.name}
                    className="cb-row flex items-center gap-3 rounded-xl px-1 py-2"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tint-strong text-base">
                      {item.icon || item.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{brl(item.value)}</span>
                    <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                      {pctLabel(pct)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {rest.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line-strong text-sm font-medium text-foreground transition-colors hover:bg-tint"
              >
                {showAll ? "Mostrar menos" : "Ver todas"}
                {showAll ? <ChevronDownIcon className="h-4 w-4 rotate-180" /> : <ArrowUpRightIcon className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
