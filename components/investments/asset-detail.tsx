"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteInvestmentAction, recordTradeAction } from "@/app/actions/investments";
import { MarketChart, type ChartMode } from "@/components/investments/market-chart";
import { ChartControls } from "@/components/investments/market-section";
import { useHistory } from "@/components/investments/use-history";
import { brl, money, qty, signedBrl, signedPct, timeAgo, toneClass } from "@/components/investments/format";
import { inputClass, labelClass } from "@/components/investments/market-asset-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import type { InvestmentTrade } from "@/lib/investments";
import type { Position } from "@/lib/market/portfolio";
import { ASSET_CLASS_LABEL, type HistoryRange } from "@/lib/market/symbols";
import { cn } from "@/lib/utils";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function AssetDetail({
  position,
  trades,
  now,
  onOpenChange,
}: {
  position: Position | null;
  trades: InvestmentTrade[];
  now: number;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!position} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        {position && (
          <DetailBody
            key={position.id}
            position={position}
            trades={trades.filter((t) => t.investment_id === position.id)}
            now={now}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({
  position: p,
  trades,
  now,
  onClose,
}: {
  position: Position;
  trades: InvestmentTrade[];
  now: number;
  onClose: () => void;
}) {
  const [range, setRange] = useState<HistoryRange>("1d");
  const [mode, setMode] = useState<ChartMode>("line");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { data: history, loading } = useHistory(
    p.ticker && p.assetClass ? `ticker=${encodeURIComponent(p.ticker)}&class=${p.assetClass}` : null,
    range
  );
  const points = history?.points ?? [];
  const first = points[0]?.close;
  const last = points[points.length - 1]?.close;
  const base = range === "1d" ? (history?.previousClose ?? first) : first;
  const rangeChange = base && last ? (last / base - 1) * 100 : null;

  function handleTrade(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await recordTradeAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(side === "buy" ? "Compra registrada." : "Venda registrada.");
    });
  }

  function handleDelete() {
    if (!confirm(`Remover ${p.ticker} da carteira? As operações registradas também serão apagadas.`)) return;
    const fd = new FormData();
    fd.set("id", p.id);
    startTransition(async () => {
      try {
        await deleteInvestmentAction(fd);
        toast.success("Ativo removido.");
        onClose();
      } catch {
        toast.error("Não foi possível remover agora.");
      }
    });
  }

  const currency = p.currency;

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-xl">
          {p.ticker}
          <span className="rounded-md bg-tint px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {p.assetClass ? ASSET_CLASS_LABEL[p.assetClass] : p.classLabel}
          </span>
        </DialogTitle>
        <DialogDescription className="truncate">{p.name}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="forge-figure text-4xl">{p.price != null ? money(p.price, currency) : "—"}</p>
          <p className={cn("mt-1 text-sm tabular-nums", toneClass(p.dayChangePct))}>
            {signedPct(p.dayChangePct)} hoje
            <span className="text-faint"> · {p.stale ? "último valor salvo" : timeAgo(p.quoteTime, now)}</span>
          </p>
        </div>
        <ChartControls range={range} onRange={setRange} mode={mode} onMode={setMode} />
      </div>

      <div className="rounded-2xl border border-line bg-surface-solid p-2">
        {loading ? (
          <div className="h-[260px] animate-pulse rounded-xl bg-tint" />
        ) : !points.length ? (
          <div className="flex h-[260px] items-center justify-center px-4 text-center text-xs text-faint">
            {history?.error ?? "Sem dados para esse período."}
          </div>
        ) : (
          <MarketChart
            points={points}
            mode={mode}
            previousClose={range === "1d" ? history?.previousClose : null}
            intraday={range === "1d" || range === "5d"}
            formatPrice={(v) => money(v, currency)}
            live={range === "1d" && p.marketOpen}
            height={260}
          />
        )}
      </div>
      {rangeChange != null && (
        <p className="-mt-3 text-xs text-faint">
          {range === "1d" ? "Hoje" : "No período"}: <span className={cn("tabular-nums", toneClass(rangeChange))}>{signedPct(rangeChange)}</span>
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Quantidade", qty(p.quantity)],
          ["Preço médio", money(p.avgPrice, currency)],
          ["Valor hoje", brl(p.value)],
          ["Custo total", brl(p.invested)],
          ["Resultado", `${signedBrl(p.profit)} (${signedPct(p.profitPct)})`],
          ["Peso na carteira", `${p.weight.toFixed(1).replace(".", ",")}%`],
        ].map(([label, value], i) => (
          <div key={label} className="rounded-xl border border-line bg-surface-solid px-3 py-2">
            <dt className="text-[11px] text-faint">{label}</dt>
            <dd className={cn("mt-0.5 truncate text-sm font-semibold tabular-nums text-foreground", i === 4 && toneClass(p.profit))}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <form action={handleTrade} className="space-y-3 rounded-2xl border border-line bg-tint p-4">
        <input type="hidden" name="investment_id" value={p.id} />
        <input type="hidden" name="asset_class" value={p.assetClass ?? ""} />
        <input type="hidden" name="side" value={side} />
        <div className="flex gap-1 rounded-xl bg-surface-solid p-1">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={cn(
                "flex-1 rounded-lg py-1.5 text-sm font-medium transition",
                side === s
                  ? s === "buy"
                    ? "bg-success/15 text-success"
                    : "bg-danger/15 text-danger"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "buy" ? "Registrar compra" : "Registrar venda"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="tr-qty" className={labelClass}>Quantidade</label>
            <input id="tr-qty" name="quantity" required inputMode="decimal" className={inputClass} />
          </div>
          <div>
            <label htmlFor="tr-price" className={labelClass}>Preço ({currency === "USD" ? "US$" : "R$"})</label>
            <input
              id="tr-price"
              name="price"
              required
              inputMode="decimal"
              defaultValue={p.price != null ? p.price.toFixed(p.price < 1 ? 6 : 2).replace(".", ",") : ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="tr-fees" className={labelClass}>Taxas</label>
            <MoneyInput id="tr-fees" name="fees" prefix className={inputClass} />
          </div>
          <div>
            <label htmlFor="tr-date" className={labelClass}>Data</label>
            <input id="tr-date" name="traded_at" type="date" max={today()} defaultValue={today()} className={inputClass} />
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isPending} className="min-h-10 w-full">
          {isPending ? "Salvando..." : side === "buy" ? "Salvar compra" : "Salvar venda"}
        </Button>
      </form>

      <div>
        <p className="forge-panel-title mb-2">Operações</p>
        {!trades.length ? (
          <p className="text-sm text-faint">Nenhuma operação registrada.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {trades.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className={t.side === "buy" ? "font-medium text-success" : "font-medium text-danger"}>
                    {t.side === "buy" ? "Compra" : "Venda"} · {qty(t.quantity)} × {money(t.price, currency)}
                  </p>
                  <p className="text-xs text-faint">
                    {new Date(`${t.traded_at}T12:00:00`).toLocaleDateString("pt-BR")}
                    {t.fees > 0 ? ` · taxas ${brl(t.fees)}` : ""}
                  </p>
                </div>
                {t.realized_profit != null && (
                  <span className={cn("shrink-0 text-xs tabular-nums", toneClass(t.realized_profit))}>
                    {signedBrl(t.realized_profit)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs text-faint underline-offset-2 hover:text-danger hover:underline"
      >
        Remover {p.ticker} da carteira
      </button>
    </div>
  );
}
