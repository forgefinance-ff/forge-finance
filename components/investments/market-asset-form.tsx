"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { createMarketInvestmentAction, lookupAssetAction } from "@/app/actions/investments";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";
import { money, signedPct, toneClass } from "@/components/investments/format";
import { ASSET_CLASSES, ASSET_CLASS_LABEL, guessAssetClass, type AssetClass } from "@/lib/market/symbols";

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface-solid px-4 py-3 text-foreground outline-none transition placeholder:text-faint hover:border-faint focus:border-brand focus:ring-2 focus:ring-brand/15";
export const labelClass = "mb-1.5 block text-sm font-medium text-text-soft";

const PLACEHOLDER: Record<AssetClass, string> = {
  acao: "PETR4, ITUB4, WEGE3",
  fii: "HGLG11, MXRF11",
  etf: "BOVA11, IVVB11",
  bdr: "AAPL34, MSFT34",
  cripto: "BTC, ETH, SOL",
  exterior: "AAPL, VOO, NVDA",
};

type Lookup =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; ticker: string; name: string | null; price: number; currency: string; changePct: number | null }
  | { state: "error"; error: string };

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

export function MarketAssetForm({ onDone }: { onDone?: () => void }) {
  const [assetClass, setAssetClass] = useState<AssetClass>("acao");
  const [classTouched, setClassTouched] = useState(false);
  const [ticker, setTicker] = useState("");
  const [price, setPrice] = useState("");
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confere o código enquanto digita (com pausa) e sugere o preço atual.
  function scheduleLookup(code: string, cls: AssetClass) {
    if (timer.current) clearTimeout(timer.current);
    const my = ++seq.current;
    if (code.trim().length < 2) {
      setLookup({ state: "idle" });
      return;
    }
    timer.current = setTimeout(async () => {
      setLookup({ state: "loading" });
      const res = await lookupAssetAction(code.trim(), cls);
      if (my !== seq.current) return;
      if (res.ok) {
        setLookup({ state: "ok", ...res });
        setPrice((p) => (p ? p : res.price.toFixed(res.price < 1 ? 6 : 2).replace(".", ",")));
      } else {
        setLookup({ state: "error", error: res.error });
      }
    }, 600);
  }

  function onTickerChange(value: string) {
    const code = value.toUpperCase();
    setTicker(code);
    let cls = assetClass;
    if (!classTouched && code.trim().length >= 3) {
      cls = guessAssetClass(code);
      setAssetClass(cls);
    }
    scheduleLookup(code, cls);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createMarketInvestmentAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Ativo adicionado à carteira.");
      setTicker("");
      setPrice("");
      setLookup({ state: "idle" });
      onDone?.();
    });
  }

  const currency = assetClass === "exterior" ? "USD" : "BRL";

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mk-ticker" className={labelClass}>
            Código do ativo
          </label>
          <input
            id="mk-ticker"
            name="ticker"
            required
            maxLength={16}
            autoComplete="off"
            autoCapitalize="characters"
            value={ticker}
            onChange={(e) => onTickerChange(e.target.value)}
            placeholder={PLACEHOLDER[assetClass]}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="mk-class" className={labelClass}>
            Tipo
          </label>
          <select
            id="mk-class"
            name="asset_class"
            value={assetClass}
            onChange={(e) => {
              const cls = e.target.value as AssetClass;
              setAssetClass(cls);
              setClassTouched(true);
              scheduleLookup(ticker, cls);
            }}
            className={inputClass}
          >
            {ASSET_CLASSES.map((c) => (
              <option key={c} value={c}>
                {ASSET_CLASS_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className="min-h-[2.75rem]">
        {lookup.state === "loading" && <p className="text-sm text-faint">Buscando cotação…</p>}
        {lookup.state === "error" && <p className="text-sm text-danger">{lookup.error}</p>}
        {lookup.state === "ok" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-tint px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{lookup.name ?? lookup.ticker}</p>
              <p className="text-xs text-faint">{lookup.ticker} · cotação agora</p>
            </div>
            <div className="text-right">
              <p className="font-semibold tabular-nums text-foreground">{money(lookup.price, lookup.currency)}</p>
              <p className={`text-xs tabular-nums ${toneClass(lookup.changePct)}`}>{signedPct(lookup.changePct)} hoje</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="mk-qty" className={labelClass}>
            Quantidade
          </label>
          <input
            id="mk-qty"
            name="quantity"
            required
            inputMode="decimal"
            placeholder={assetClass === "cripto" ? "Ex.: 0,0025" : "Ex.: 100"}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="mk-price" className={labelClass}>
            Preço pago por unidade ({currency === "USD" ? "US$" : "R$"})
          </label>
          <input
            id="mk-price"
            name="price"
            required
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Ex.: 32,50"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-faint">É o seu preço médio. Veja na nota de corretagem ou no app da corretora.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="mk-date" className={labelClass}>
            Data da compra
          </label>
          <input id="mk-date" name="traded_at" type="date" max={today()} defaultValue={today()} className={inputClass} />
        </div>
        <div>
          <label htmlFor="mk-fees" className={labelClass}>
            Taxas (opcional)
          </label>
          <MoneyInput id="mk-fees" name="fees" prefix className={inputClass} />
        </div>
        <div>
          <label htmlFor="mk-inst" className={labelClass}>
            Corretora
          </label>
          <input id="mk-inst" name="institution" maxLength={60} placeholder="Ex.: XP, Rico, Nubank" className={inputClass} />
        </div>
      </div>

      {currency === "USD" && (
        <p className="text-xs text-faint">
          Ativos dos EUA: o custo em reais usa o dólar de hoje. O valor atual acompanha o dólar ao vivo.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="min-h-11 w-full">
        {isPending ? "Salvando..." : "Adicionar à carteira"}
      </Button>
    </form>
  );
}
