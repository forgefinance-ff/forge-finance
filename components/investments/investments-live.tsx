"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  AlertTriangle,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { deleteInvestmentAction, updateInvestmentValueAction } from "@/app/actions/investments";
import { AssetDetail } from "@/components/investments/asset-detail";
import { brl, money, qty, signedBrl, signedPct, timeAgo, toneClass } from "@/components/investments/format";
import { InvestmentForm } from "@/components/investments/investment-form";
import { inputClass, MarketAssetForm } from "@/components/investments/market-asset-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import type { PortfolioView } from "@/lib/investments";
import { chartTooltipItemStyle, chartTooltipLabelStyle, chartTooltipStyle } from "@/lib/chart-theme";
import type { Insight, Position } from "@/lib/market/portfolio";
import { cn } from "@/lib/utils";

const PALETTE = ["#7c3aed", "#22d3ee", "#4f46e5", "#c084fc", "#10b981", "#f59e0b", "#e879f9", "#818cf8"];

const OPEN_INTERVAL_MS = 30_000;
const CLOSED_INTERVAL_MS = 5 * 60_000;

export function InvestmentsLive({ initial }: { initial: PortfolioView }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(() => initial.fetchedAt);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [flash, setFlash] = useState<Record<string, "up" | "down">>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<null | "market" | "manual">(null);
  const lastPrices = useRef(new Map(initial.positions.map((p) => [p.id, p.price])));

  // Depois de salvar algo, o servidor manda uma carteira nova: adota a mais recente.
  const [seenInitial, setSeenInitial] = useState(initial.fetchedAt);
  if (initial.fetchedAt !== seenInitial) {
    setSeenInitial(initial.fetchedAt);
    if (initial.fetchedAt > data.fetchedAt) setData(initial);
  }

  const apply = useCallback((next: PortfolioView) => {
    const changes: Record<string, "up" | "down"> = {};
    for (const p of next.positions) {
      const before = lastPrices.current.get(p.id);
      if (before != null && p.price != null && p.price !== before) changes[p.id] = p.price > before ? "up" : "down";
      lastPrices.current.set(p.id, p.price);
    }
    setData(next);
    if (Object.keys(changes).length) {
      setFlash(changes);
      setTimeout(() => setFlash({}), 1400);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/market/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      apply((await res.json()) as PortfolioView);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setRefreshing(false);
    }
  }, [apply]);

  const marketOpen =
    data.positions.some((p) => p.kind === "market" && p.marketOpen) || !!data.ibovespa?.marketOpen;
  const hasMarket = data.positions.some((p) => p.kind === "market");

  // Atualiza sozinho: a cada 30 s com o pregão aberto, a cada 5 min fora dele. Pausa com a aba escondida.
  useEffect(() => {
    if (!hasMarket && !data.ibovespa) return;
    const every = marketOpen ? OPEN_INTERVAL_MS : CLOSED_INTERVAL_MS;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, every);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - data.fetchedAt > every) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [marketOpen, hasMarket, data.ibovespa, data.fetchedAt, refresh]);

  // Relógio para o "atualizado há Xs".
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(id);
  }, []);

  const market = data.positions.filter((p) => p.kind === "market");
  const manual = data.positions.filter((p) => p.kind === "manual");
  const selected = data.positions.find((p) => p.id === selectedId) ?? null;

  const status = offline || !data.live
    ? { label: "Sem conexão com a bolsa · mostrando últimos valores", dot: "bg-amber-400", pulse: false }
    : marketOpen
      ? { label: "Ao vivo", dot: "bg-emerald-400", pulse: true }
      : { label: "Mercado fechado · últimos preços", dot: "bg-faint", pulse: false };

  function closeAdd() {
    setAdding(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Faixa do mercado */}
      <section className="forge-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <IndexChip label="Ibovespa" value={data.ibovespa?.price != null ? data.ibovespa.price.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) + " pts" : "—"} pct={data.ibovespa?.changePct ?? null} />
          <IndexChip label="Dólar" value={data.dolar?.price != null ? brl(data.dolar.price) : "—"} pct={data.dolar?.changePct ?? null} />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              {status.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", status.dot)} />}
              <span className={cn("relative inline-flex h-2 w-2 rounded-full", status.dot)} />
            </span>
            {status.label}
          </span>
          <span className="text-faint">· {timeAgo(data.fetchedAt, Math.max(now, data.fetchedAt))}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Atualizar cotações"
            className="rounded-lg p-1.5 text-faint transition hover:bg-tint hover:text-foreground"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
        </div>
      </section>

      {/* Números principais */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Patrimônio investido" value={brl(data.total)} hint={`Custo: ${brl(data.invested)}`} />
        <Kpi
          title="Hoje"
          value={hasMarket ? signedBrl(data.dayChange) : "—"}
          hint={hasMarket ? `${signedPct(data.dayChangePct)} na parte em bolsa` : "Adicione ações para acompanhar"}
          tone={hasMarket ? data.dayChange : null}
        />
        <Kpi
          title="Resultado total"
          value={signedBrl(data.profit)}
          hint={`${signedPct(data.profitPct)} sobre o custo (não realizado)`}
          tone={data.profit}
        />
        <Kpi
          title="Lucro realizado"
          value={data.realizedProfit ? signedBrl(data.realizedProfit) : brl(0)}
          hint="Soma das vendas registradas"
          tone={data.realizedProfit || null}
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setAdding("market")} className="min-h-10">
          <Plus className="mr-1 h-4 w-4" /> Ação, FII, ETF ou cripto
        </Button>
        <Button variant="outline" onClick={() => setAdding("manual")} className="min-h-10">
          <Plus className="mr-1 h-4 w-4" /> Renda fixa e outros
        </Button>
      </div>

      {data.positions.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-line-strong bg-surface p-8 text-center">
          <p className="text-lg font-semibold text-foreground">Sua carteira ainda está vazia</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Adicione o código da ação (ex.: PETR4), a quantidade e o preço que você pagou. O Forge busca a cotação e
            calcula seu resultado sozinho, o dia todo.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Allocation slices={data.allocation} total={data.total} />
            <Insights items={data.insights} />
          </div>

          {market.length > 0 && (
            <Positions positions={market} flash={flash} onOpen={setSelectedId} />
          )}

          {manual.length > 0 && <ManualList positions={manual} onChanged={() => router.refresh()} />}
        </>
      )}

      <p className="text-[11px] leading-relaxed text-faint">
        Cotações automáticas: B3 com atraso de até 15 minutos (regra da bolsa para dados gratuitos); cripto e dólar
        quase em tempo real. Análise informativa, não é recomendação de investimento.
      </p>

      <AssetDetail
        position={selected}
        trades={data.trades}
        now={now}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      />

      <Dialog open={adding !== null} onOpenChange={(open) => !open && setAdding(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{adding === "manual" ? "Renda fixa e outros" : "Adicionar ativo da bolsa"}</DialogTitle>
            <DialogDescription>
              {adding === "manual"
                ? "CDB, Tesouro, previdência e o que não tem cotação na bolsa: você informa o valor."
                : "Ações, FIIs, ETFs, BDRs, cripto e ações dos EUA. A cotação é automática."}
            </DialogDescription>
          </DialogHeader>
          {adding === "market" && <MarketAssetForm onDone={closeAdd} />}
          {adding === "manual" && <InvestmentForm embedded onDone={closeAdd} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IndexChip({ label, value, pct }: { label: string; value: string; pct: number | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-faint">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      <span className={cn("text-xs tabular-nums", toneClass(pct))}>{signedPct(pct)}</span>
    </div>
  );
}

function Kpi({ title, value, hint, tone }: { title: string; value: string; hint: string; tone?: number | null }) {
  return (
    <div className="forge-panel p-5">
      <p className="text-xs text-faint">{title}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", tone == null ? "text-foreground" : toneClass(tone))}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Allocation({ slices, total }: { slices: PortfolioView["allocation"]; total: number }) {
  return (
    <section className="forge-panel p-5 lg:col-span-2">
      <p className="forge-panel-title">Onde está seu dinheiro</p>
      {total <= 0 ? (
        <p className="mt-4 text-sm text-faint">Sem valores para mostrar.</p>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="value" nameKey="label" innerRadius={50} outerRadius={72} paddingAngle={3} cornerRadius={6} stroke="none">
                  {slices.map((s, i) => (
                    <Cell key={s.key} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [brl(Number(v)), String(n)]}
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartTooltipLabelStyle}
                  itemStyle={chartTooltipItemStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-2">
            {slices.map((s, i) => (
              <li key={s.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-text-soft">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {s.pct.toFixed(0)}% · {brl(s.value)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const INSIGHT_ICON: Record<Insight["tone"], typeof Info> = {
  good: TrendingUp,
  bad: TrendingDown,
  warn: AlertTriangle,
  info: Info,
};

const INSIGHT_TONE: Record<Insight["tone"], string> = {
  good: "text-success bg-success/10",
  bad: "text-danger bg-danger/10",
  warn: "text-amber-500 bg-amber-500/10",
  info: "text-brand bg-brand/10",
};

function Insights({ items }: { items: Insight[] }) {
  return (
    <section className="forge-panel p-5 lg:col-span-3">
      <p className="forge-panel-title">Análise da carteira</p>
      {!items.length ? (
        <p className="mt-4 text-sm text-faint">Adicione ativos da bolsa para ver a análise do dia.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((it) => {
            const Icon = INSIGHT_ICON[it.tone];
            return (
              <li key={it.title} className="flex gap-3">
                <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", INSIGHT_TONE[it.tone])}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{it.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{it.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Positions({
  positions,
  flash,
  onOpen,
}: {
  positions: Position[];
  flash: Record<string, "up" | "down">;
  onOpen: (id: string) => void;
}) {
  const flashClass = (id: string) =>
    flash[id] === "up" ? "bg-success/15" : flash[id] === "down" ? "bg-danger/15" : "";

  return (
    <section className="forge-panel overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <p className="forge-panel-title">Bolsa e cripto</p>
        <span className="text-[11px] text-faint">Toque num ativo para ver gráfico e operações</span>
      </div>

      {/* Celular */}
      <ul className="divide-y divide-line sm:hidden">
        {positions.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onOpen(p.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{p.ticker}</p>
                <p className="truncate text-xs text-faint">
                  {qty(p.quantity)} × {p.price != null ? money(p.price, p.currency) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className={cn("rounded px-1 font-semibold tabular-nums text-foreground transition-colors duration-700", flashClass(p.id))}>
                  {brl(p.value)}
                </p>
                <p className={cn("text-xs tabular-nums", toneClass(p.dayChangePct))}>{signedPct(p.dayChangePct)} hoje</p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* Computador */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-y border-line text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5 font-medium">Ativo</th>
              <th className="px-3 py-2.5 text-right font-medium">Cotação</th>
              <th className="px-3 py-2.5 text-right font-medium">Hoje</th>
              <th className="px-3 py-2.5 text-right font-medium">Qtd. · PM</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor</th>
              <th className="px-3 py-2.5 text-right font-medium">Resultado</th>
              <th className="px-5 py-2.5 text-right font-medium">Peso</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr
                key={p.id}
                onClick={() => onOpen(p.id)}
                className="cursor-pointer border-b border-line transition last:border-0 hover:bg-tint"
              >
                <td className="px-5 py-3">
                  <button type="button" className="text-left" onClick={() => onOpen(p.id)}>
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      {p.ticker}
                      <span className="rounded bg-tint px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{p.classLabel}</span>
                      {p.stale && <span title="Sem cotação nova: último valor salvo" className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
                    </span>
                    <span className="block max-w-[220px] truncate text-xs text-faint">{p.name}</span>
                  </button>
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={cn("rounded px-1 tabular-nums text-foreground transition-colors duration-700", flashClass(p.id))}>
                    {p.price != null ? money(p.price, p.currency) : "—"}
                  </span>
                </td>
                <td className={cn("px-3 py-3 text-right tabular-nums", toneClass(p.dayChangePct))}>
                  {signedPct(p.dayChangePct)}
                  <span className="block text-xs">{p.dayChange ? signedBrl(p.dayChange) : ""}</span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-text-soft">
                  {qty(p.quantity)}
                  <span className="block text-xs text-faint">{money(p.avgPrice, p.currency)}</span>
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">{brl(p.value)}</td>
                <td className={cn("px-3 py-3 text-right tabular-nums", toneClass(p.profit))}>
                  {signedBrl(p.profit)}
                  <span className="block text-xs">{signedPct(p.profitPct)}</span>
                </td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">
                  {p.weight.toFixed(1).replace(".", ",")}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ManualList({ positions, onChanged }: { positions: Position[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(formData: FormData) {
    startTransition(async () => {
      const res = await updateInvestmentValueAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Valor atualizado.");
      setEditing(null);
      onChanged();
    });
  }

  function remove(p: Position) {
    if (!confirm(`Excluir ${p.name}?`)) return;
    const fd = new FormData();
    fd.set("id", p.id);
    startTransition(async () => {
      try {
        await deleteInvestmentAction(fd);
        onChanged();
      } catch {
        toast.error("Não foi possível excluir agora.");
      }
    });
  }

  return (
    <section className="forge-panel overflow-hidden">
      <div className="p-5 pb-3">
        <p className="forge-panel-title">Renda fixa e outros</p>
        <p className="mt-0.5 text-xs text-faint">Sem cotação automática: atualize o valor quando olhar o app do banco.</p>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {positions.map((p) => (
          <li key={p.id} className="px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-faint">{[p.institution, p.classLabel].filter(Boolean).join(" · ")}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular-nums text-foreground">{brl(p.value)}</p>
                <p className={cn("text-xs tabular-nums", toneClass(p.profit))}>
                  {signedBrl(p.profit)} ({signedPct(p.profitPct)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(editing === p.id ? null : p.id)}
                aria-label={`Atualizar valor de ${p.name}`}
                className="rounded-lg p-2 text-faint transition hover:bg-tint hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(p)}
                disabled={isPending}
                aria-label={`Excluir ${p.name}`}
                className="rounded-lg p-2 text-faint transition hover:bg-rose-500/10 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {editing === p.id && (
              <form action={save} className="mt-3 flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <MoneyInput name="current_value" defaultValue={p.value} prefix required className={cn(inputClass, "py-2")} aria-label="Valor hoje" />
                <Button type="submit" disabled={isPending} className="shrink-0">
                  {isPending ? "..." : "Salvar"}
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
