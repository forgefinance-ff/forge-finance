import Link from "next/link";

import { brl } from "@/components/business/format";
import type { RxScope } from "@/lib/raio-x-calc";
import type { RaioXData } from "@/lib/raio-x";

import { RxCard, RxInsight } from "./rx-card";

export function AllocationCard({
  allocation,
  scope,
}: {
  allocation: RaioXData["allocation"];
  scope: RxScope;
}) {
  const { slices, income, out, overspent } = allocation;
  const blocks = slices.flatMap((s) => Array.from({ length: s.blocks }, (_, i) => ({ key: `${s.key}-${i}`, s })));
  const base = Math.max(income, out);
  const unclassified = slices.find((s) => s.key === "unclassified");
  const left = slices.find((s) => s.key === "left");

  return (
    <RxCard
      title="Para onde vai cada R$ 100"
      description={
        income >= out
          ? `De cada R$ 100 que entraram nos últimos 30 dias (${brl(income)} no total)`
          : `De cada R$ 100 que saíram nos últimos 30 dias (${brl(out)} no total)`
      }
      badge="30 dias"
    >
      {base <= 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted-foreground">
          Sem movimento nos últimos 30 dias.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-20 gap-1">
            {blocks.map(({ key, s }) => (
              <div
                key={key}
                title={`${s.label}: ${brl(s.amount)}`}
                className="aspect-[2/3] rounded-[4px]"
                style={{ backgroundColor: s.color }}
              />
            ))}
          </div>

          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {slices.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1 truncate text-text-soft" title={s.label}>
                  {s.label}
                </span>
                <b className="tabular-nums text-foreground">R$ {s.blocks}</b>
              </li>
            ))}
          </ul>

          {overspent > 0 ? (
            <RxInsight>
              Saiu <b className="text-danger">{brl(overspent)}</b> a mais do que entrou nos últimos 30 dias.
            </RxInsight>
          ) : left && left.blocks > 0 ? (
            <RxInsight>
              Sobraram <b className="text-foreground">R$ {left.blocks}</b> de cada R$ 100 ({brl(left.amount)}).
            </RxInsight>
          ) : null}

          {unclassified && unclassified.blocks >= 10 && (
            <p className="mt-3 text-xs text-faint">
              {unclassified.blocks}% está em categorias sem{" "}
              {scope === "business" ? "classe de custo" : "grupo (essencial ou estilo de vida)"}.{" "}
              <Link href="/categorias" className="font-medium text-brand-soft hover:underline">
                Classificar em Categorias
              </Link>
            </p>
          )}
        </>
      )}
    </RxCard>
  );
}
