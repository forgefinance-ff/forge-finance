"use client";

import { useEffect, useRef } from "react";

import type { NetWorthDay } from "../data/net-worth";

import "./net-worth-candles.css";

type PeriodKey = "1M" | "3M" | "6M" | "1A";
const PERIODS: { key: PeriodKey; days: number; label: string }[] = [
  { key: "1M", days: 30, label: "Últimos 30 dias" },
  { key: "3M", days: 90, label: "Últimos 3 meses" },
  { key: "6M", days: 182, label: "Últimos 6 meses" },
  { key: "1A", days: 365, label: "Últimos 12 meses" },
];
const N = 24; // velas em todos os períodos: elas se transformam umas nas outras
const PAD = 6;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type Candle = { o: number; c: number; h: number; l: number; end: string };

/** Divide os dias do período em N velas: abertura, fechamento, máxima e mínima. */
function buildCandles(days: NetWorthDay[], period: number): Candle[] {
  const slice = days.slice(-period - 1); // um dia antes para a abertura
  const out: Candle[] = [];
  for (let i = 0; i < N; i++) {
    const from = 1 + Math.floor((i * (slice.length - 1)) / N);
    const to = 1 + Math.floor(((i + 1) * (slice.length - 1)) / N) - 1;
    const o = slice[from - 1]?.value ?? 0;
    const bucket = slice.slice(from, Math.max(from, to) + 1);
    const values = bucket.map((d) => d.value);
    const c = values.length ? values[values.length - 1] : o;
    out.push({
      o,
      c,
      h: Math.max(o, ...values),
      l: Math.min(o, ...values),
      end: (bucket[bucket.length - 1] ?? slice[from - 1])?.date ?? "",
    });
  }
  return out;
}

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function changeText(candles: Candle[]) {
  const start = candles[0]?.o ?? 0;
  const end = candles[candles.length - 1]?.c ?? 0;
  const diff = end - start;
  if (Math.abs(start) < 1) return { text: `${diff >= 0 ? "+" : "−"}${money(Math.abs(diff))}`, up: diff >= 0 };
  const pct = (diff / Math.abs(start)) * 100;
  return {
    text: `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`,
    up: pct >= 0,
  };
}

function dateLabel(iso: string, withYear: boolean) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${String(y).slice(2)}` : ""}`;
}

/** Lê uma duração em ms do CSS ("200ms" ou ".2s", como o build reescreve). */
function ms(el: Element, name: string) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const v = parseFloat(raw) || 0;
  return /\ds$/.test(raw) && !/ms$/.test(raw) ? v * 1000 : v;
}

/**
 * Evolução patrimonial em velas (Crypto Candle Chart, transitions.dev
 * Community): as velas se transformam ao trocar o período, o selo e a legenda
 * trocam com desfoque e arrastar sobre o gráfico mostra o fechamento de cada vela.
 */
export function NetWorthCandles({ days }: { days: NetWorthDay[] }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const chart = root.querySelector<HTMLDivElement>(".cc-chart")!;
    const cross = root.querySelector<HTMLSpanElement>(".cc-cross")!;
    const priceEl = root.querySelector<HTMLSpanElement>(".cc-price")!;
    const captionEl = root.querySelector<HTMLSpanElement>("#cc-caption")!;
    const changeEl = root.querySelector<HTMLSpanElement>("#cc-change")!;
    const badge = root.querySelector<HTMLSpanElement>(".cc-badge")!;
    const bar = root.querySelector<HTMLDivElement>(".cc-tabs")!;
    const pill = bar.querySelector<HTMLSpanElement>(".cc-tabs-pill")!;
    const tabs = [...bar.querySelectorAll<HTMLButtonElement>(".cc-tab")];
    const END = days[days.length - 1]?.value ?? 0;

    type SoftEl = HTMLElement & { _softTimer?: number };
    function softSwap(el: SoftEl, next: string) {
      const prev = el.dataset.text ?? el.textContent ?? "";
      if (prev === next) return;
      el.dataset.text = next;
      window.clearTimeout(el._softTimer);
      const out = document.createElement("span");
      out.className = "cc-soft-old";
      out.setAttribute("aria-hidden", "true");
      out.textContent = prev;
      const inn = document.createElement("span");
      inn.className = "cc-soft-new";
      inn.textContent = next;
      const w0 = el.getBoundingClientRect().width;
      el.classList.remove("is-swapping");
      el.replaceChildren(out, inn);
      const w1 = inn.getBoundingClientRect().width;
      el.style.width = `${w0}px`;
      void el.offsetWidth;
      el.classList.add("is-swapping");
      el.style.width = `${w1}px`;
      el._softTimer = window.setTimeout(() => {
        el.classList.remove("is-swapping");
        el.style.removeProperty("width");
        el.textContent = next;
      }, Math.max(ms(root!, "--text-soft-dur"), ms(root!, "--text-soft-resize-dur")) + 40);
    }
    // Leituras do ponteiro trocam na hora.
    function setInstant(el: SoftEl, text: string) {
      window.clearTimeout(el._softTimer);
      el.classList.remove("is-swapping");
      el.style.removeProperty("width");
      el.textContent = text;
      el.dataset.text = text;
    }

    const data = Object.fromEntries(PERIODS.map((p) => [p.key, buildCandles(days, p.days)])) as Record<
      PeriodKey,
      Candle[]
    >;
    const label = (k: PeriodKey) => PERIODS.find((p) => p.key === k)!.label;

    // Velas
    chart.querySelectorAll(".cc-candle").forEach((el) => el.remove());
    const candles = Array.from({ length: N }, () => {
      const el = document.createElement("div");
      el.className = "cc-candle";
      const w = document.createElement("span");
      w.className = "cc-wick";
      const b = document.createElement("span");
      b.className = "cc-body";
      el.append(w, b);
      chart.insertBefore(el, cross);
      return { el, w, b };
    });

    let current: PeriodKey = "3M";
    function layout() {
      const W = chart.clientWidth;
      const step = W / N;
      const cw = Math.max(6, Math.min(14, step * 0.5));
      chart.style.setProperty("--cc-candle-w", `${cw}px`);
      candles.forEach((c, i) => {
        c.el.style.left = `${i * step + (step - cw) / 2}px`;
      });
    }
    function draw(key: PeriodKey) {
      const d = data[key];
      const H = chart.clientHeight;
      let max = -Infinity;
      let min = Infinity;
      d.forEach((k) => {
        max = Math.max(max, k.h);
        min = Math.min(min, k.l);
      });
      if (max === min) {
        max += 1;
        min -= 1;
      }
      const y = (v: number) => PAD + ((max - v) / (max - min)) * (H - 2 * PAD);
      d.forEach((k, i) => {
        const c = candles[i];
        const up = k.c >= k.o;
        // Sem variação nenhuma: vela neutra (cinza), não de alta.
        const flat = k.o === k.c && k.h === k.l;
        c.el.classList.toggle("is-flat", flat);
        c.el.classList.toggle("is-up", up && !flat);
        c.el.classList.toggle("is-down", !up && !flat);
        c.w.style.top = `${y(k.h)}px`;
        c.w.style.height = `${Math.max(1, y(k.l) - y(k.h))}px`;
        const top = y(Math.max(k.o, k.c));
        c.b.style.top = `${top}px`;
        c.b.style.height = `${Math.max(2, y(Math.min(k.o, k.c)) - top)}px`;
      });
    }
    function setBadge(key: PeriodKey, animate: boolean) {
      const ch = changeText(data[key]);
      badge.dataset.tone = ch.up ? "up" : "down";
      if (animate) softSwap(changeEl, ch.text);
      else setInstant(changeEl, ch.text);
    }

    layout();
    draw(current);
    priceEl.textContent = money(END);
    setInstant(captionEl, label(current));
    setBadge(current, false);
    void chart.offsetWidth;
    const raf0 = requestAnimationFrame(() => chart.classList.remove("is-static"));

    // Leitura ao arrastar
    let active = -1;
    function scrub(e: PointerEvent) {
      const r = chart.getBoundingClientRect();
      const i = Math.max(0, Math.min(N - 1, Math.floor(((e.clientX - r.left) / r.width) * N)));
      chart.classList.add("is-hover");
      if (i === active) return;
      if (active >= 0) candles[active].el.classList.remove("is-active");
      active = i;
      candles[i].el.classList.add("is-active");
      const step = r.width / N;
      cross.style.transform = `translateX(${i * step + step / 2 - 0.5}px)`;
      priceEl.textContent = money(data[current][i].c);
      setInstant(captionEl, dateLabel(data[current][i].end, current === "1A"));
    }
    function release() {
      chart.classList.remove("is-hover");
      if (active >= 0) candles[active].el.classList.remove("is-active");
      active = -1;
      priceEl.textContent = money(END);
      setInstant(captionEl, label(current));
    }
    chart.addEventListener("pointermove", scrub);
    chart.addEventListener("pointerdown", scrub);
    chart.addEventListener("pointerleave", release);
    chart.addEventListener("pointercancel", release);

    // Abas
    function moveTo(tab: HTMLElement, animate: boolean) {
      if (!animate) {
        const prev = pill.style.transition;
        pill.style.transition = "none";
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
        void pill.offsetWidth;
        pill.style.transition = prev;
      } else {
        pill.style.transform = `translateX(${tab.offsetLeft}px)`;
        pill.style.width = `${tab.offsetWidth}px`;
      }
    }
    const activeTab = () => tabs.find((t) => t.getAttribute("aria-selected") === "true") ?? tabs[0];
    const onClick = (tab: HTMLButtonElement) => () => {
      tabs.forEach((t) => t.setAttribute("aria-selected", t === tab ? "true" : "false"));
      moveTo(tab, true);
      const key = tab.dataset.p as PeriodKey;
      if (key === current) return;
      current = key;
      draw(key);
      setBadge(key, true);
      softSwap(captionEl, label(key));
    };
    const handlers = tabs.map((tab) => {
      const h = onClick(tab);
      tab.addEventListener("click", h);
      return h;
    });
    const raf1 = requestAnimationFrame(() => moveTo(activeTab(), false));
    const onResize = () => {
      moveTo(activeTab(), false);
      layout();
      chart.classList.add("is-static");
      draw(current);
      void chart.offsetWidth;
      chart.classList.remove("is-static");
    };
    window.addEventListener("resize", onResize);

    // Toque: segura .is-pressed por pelo menos --press-dur
    const pressMin = ms(root, "--press-dur") || 150;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = (e.target as Element | null)?.closest?.(".cc-tab") as (HTMLElement & { _tPress?: number }) | null;
      if (!el) return;
      const t0 = performance.now();
      window.clearTimeout(el._tPress);
      el.classList.add("is-pressed");
      const up = () => {
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
        el._tPress = window.setTimeout(() => el.classList.remove("is-pressed"), Math.max(0, pressMin - (performance.now() - t0)));
      };
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    };
    root.addEventListener("pointerdown", onDown, { passive: true });

    return () => {
      cancelAnimationFrame(raf0);
      cancelAnimationFrame(raf1);
      chart.removeEventListener("pointermove", scrub);
      chart.removeEventListener("pointerdown", scrub);
      chart.removeEventListener("pointerleave", release);
      chart.removeEventListener("pointercancel", release);
      tabs.forEach((tab, i) => tab.removeEventListener("click", handlers[i]));
      window.removeEventListener("resize", onResize);
      root.removeEventListener("pointerdown", onDown);
    };
  }, [days]);

  return (
    <article ref={rootRef} className="cc" aria-label="Evolução patrimonial">
      <header className="cc-head">
        <div className="cc-id">
          <h2 className="cc-name">Evolução patrimonial</h2>
          <span className="cc-pair">Contas + investimentos</span>
        </div>
        <span className="cc-badge" data-tone="up">
          <span className="cc-soft" id="cc-change" />
        </span>
      </header>
      <div className="cc-price-block">
        <span className="cc-price" aria-live="polite" />
        <span className="cc-caption">
          <span className="cc-soft" id="cc-caption" />
        </span>
      </div>
      <div className="cc-chart is-static" aria-hidden="true">
        <span className="cc-grid" style={{ top: 0 }} />
        <span className="cc-grid" style={{ top: "50%" }} />
        <span className="cc-grid" style={{ bottom: 0 }} />
        <span className="cc-cross" />
      </div>
      <div className="cc-tabs" role="tablist" aria-label="Período">
        <span className="cc-tabs-pill" aria-hidden="true" />
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className="cc-tab"
            role="tab"
            aria-selected={p.key === "3M"}
            data-p={p.key}
          >
            {p.key}
          </button>
        ))}
      </div>
    </article>
  );
}
