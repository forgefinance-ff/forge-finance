import Link from "next/link";

import type { DreMonth } from "@/lib/business-calc";
import { cn } from "@/lib/utils";

import { brl, pct } from "./format";

type Line = {
  label: string;
  value: (m: DreMonth) => number;
  sign?: "-" | "=";
  strong?: boolean;
  percent?: (m: DreMonth) => number | null;
  hint?: string;
};

const LINES: Line[] = [
  { label: "Faturamento", value: (m) => m.revenue, strong: true },
  { label: "Impostos", value: (m) => m.taxes, sign: "-" },
  { label: "Custos variáveis", value: (m) => m.variable, sign: "-", hint: "insumos, frete, maquininha…" },
  {
    label: "Margem de contribuição",
    value: (m) => m.contributionMargin,
    sign: "=",
    strong: true,
    percent: (m) => m.contributionMarginPct,
  },
  { label: "Custos fixos", value: (m) => m.fixed, sign: "-", hint: "aluguel, software, contador…" },
  { label: "Pró-labore", value: (m) => m.prolabore, sign: "-" },
  { label: "Não classificado", value: (m) => m.unclassified, sign: "-" },
  { label: "Lucro", value: (m) => m.profit, sign: "=", strong: true, percent: (m) => m.profitPct },
];

export function DreTable({ dre }: { dre: DreMonth[] }) {
  const showUnclassified = dre.some((m) => m.unclassified > 0);
  const lines = LINES.filter((l) => l.label !== "Não classificado" || showUnclassified);
  const withdrawals = dre.some((m) => m.ownerWithdrawals || m.ownerContributions || m.loansIn || m.loansOut);

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6">
      <h2 className="text-lg font-semibold text-foreground">Resultado mês a mês (DRE)</h2>
      <p className="text-sm text-muted-foreground">
        As despesas entram pela classe de custo da categoria.{" "}
        <Link href="/categorias" className="font-medium text-brand-soft hover:underline">
          Ajustar em Categorias
        </Link>
        .
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-faint">
              <th className="py-2 pr-3 text-left font-semibold"> </th>
              {dre.map((m) => (
                <th key={m.month} className="px-2 py-2 text-right font-semibold">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr
                key={line.label}
                className={cn("border-b border-line/60", line.sign === "=" && "bg-tint")}
              >
                <td className="py-2 pr-3">
                  <span className={cn(line.strong ? "font-semibold text-foreground" : "text-text-soft")}>
                    {line.sign === "-" ? "(−) " : line.sign === "=" ? "(=) " : ""}
                    {line.label}
                  </span>
                  {line.hint && <span className="block text-[11px] text-faint">{line.hint}</span>}
                </td>
                {dre.map((m) => {
                  const value = line.value(m);
                  const percent = line.percent?.(m);
                  return (
                    <td key={m.month} className="px-2 py-2 text-right tabular-nums">
                      <span
                        className={cn(
                          line.strong ? "font-semibold" : "text-text-soft",
                          line.sign === "=" && value < 0 && "text-danger",
                          line.label === "Lucro" && value > 0 && "text-success"
                        )}
                      >
                        {value === 0 && !line.strong ? "—" : brl(value)}
                      </span>
                      {percent !== undefined && (
                        <span className="block text-[11px] text-faint">{pct(percent)}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withdrawals && (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">
            Fora do resultado
          </p>
          <table className="w-full min-w-[640px] text-sm">
            <tbody>
              {[
                { label: "Retiradas de lucro", value: (m: DreMonth) => m.ownerWithdrawals },
                { label: "Aportes do dono", value: (m: DreMonth) => m.ownerContributions },
                { label: "Empréstimos recebidos", value: (m: DreMonth) => m.loansIn },
                { label: "Empréstimos pagos", value: (m: DreMonth) => m.loansOut },
              ].map((line) => (
                <tr key={line.label} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-text-soft">{line.label}</td>
                  {dre.map((m) => (
                    <td key={m.month} className="px-2 py-1.5 text-right tabular-nums text-text-soft">
                      {line.value(m) ? brl(line.value(m)) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
