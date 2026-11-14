"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LearnChevron } from "@/components/motion";
import { customFace, findBank } from "@/lib/banks";
import type { CardOverview } from "@/lib/cards";
import { formatDateBR } from "@/lib/dates";
import { rollText, setText } from "@/components/motion/spinning-counter";

import "./wallet-stack.css";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const NFC_PATH =
  "M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z";

function readMs(el: Element, name: string, fallback: number) {
  // O build do Next reescreve "150ms" como ".15s": converte segundos para ms.
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const v = parseFloat(raw);
  if (!Number.isFinite(v)) return fallback;
  return /\ds$/.test(raw) && !/ms$/.test(raw) ? v * 1000 : v;
}

type WalletStackProps = {
  cards: CardOverview[];
  holder?: string | null;
};

/**
 * Pilha de cartões (Wallet Card Stack, transitions.dev Community) com os
 * cartões reais: toque num cartão para trazê-lo à frente e girar o limite
 * disponível; toque no da frente para abrir ou fechar os detalhes.
 */
export function WalletStack({ cards: overview, holder }: WalletStackProps) {
  const items = useMemo(() => overview.slice(0, 4), [overview]);
  const n = items.length;

  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i).reverse());
  const [open, setOpen] = useState(false);
  const [detailIdx, setDetailIdx] = useState(0);
  const front = order[order.length - 1] ?? 0;

  const rootRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const swapRef = useRef<HTMLSpanElement>(null);
  const shown = useRef("");
  const cancelRoll = useRef<() => void>(() => {});
  const timers = useRef<{ swap?: number; detail?: number }>({});

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !reelRef.current || !liveRef.current || n === 0) return;
    const first = brl(items[front]?.summary.available ?? 0);
    setText(reelRef.current, first);
    liveRef.current.textContent = first;
    shown.current = first;
    const t = timers.current;
    const cancel = cancelRoll;
    return () => {
      cancel.current();
      window.clearTimeout(t.swap);
      window.clearTimeout(t.detail);
    };
    // Só na montagem: depois o contador é atualizado em select().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Touch press: um toque segura .is-pressed por pelo menos --press-dur. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const min = readMs(root, "--press-dur", 150);
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const el = (e.target as Element | null)?.closest?.("button") as (HTMLButtonElement & { _tPress?: number }) | null;
      if (!el || el.disabled || !root.contains(el)) return;
      const t0 = performance.now();
      window.clearTimeout(el._tPress);
      el.classList.add("is-pressed");
      const up = () => {
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
        el._tPress = window.setTimeout(() => el.classList.remove("is-pressed"), Math.max(0, min - (performance.now() - t0)));
      };
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    };
    root.addEventListener("pointerdown", onDown, { passive: true });
    return () => root.removeEventListener("pointerdown", onDown);
  }, []);

  const swapText = useCallback((next: string) => {
    const el = swapRef.current;
    const root = rootRef.current;
    if (!el || !root) return;
    window.clearTimeout(timers.current.swap);
    el.classList.add("is-exit");
    timers.current.swap = window.setTimeout(() => {
      el.textContent = next;
      el.classList.remove("is-exit");
      el.classList.add("is-enter-start");
      void el.offsetHeight;
      el.classList.remove("is-enter-start");
    }, readMs(root, "--text-swap-dur", 150));
  }, []);

  function select(i: number) {
    const root = rootRef.current;
    const wasOpen = open;
    setOrder((current) => current.filter((x) => x !== i).concat(i));
    if (wasOpen) setOpen(false);
    const next = brl(items[i].summary.available);
    if (reelRef.current && next !== shown.current) {
      cancelRoll.current();
      cancelRoll.current = rollText(reelRef.current, shown.current, next);
      if (liveRef.current) liveRef.current.textContent = next;
      shown.current = next;
    }
    swapText(items[i].card.name);
    window.clearTimeout(timers.current.detail);
    const delay = wasOpen && root ? readMs(root, "--acc-collapse", 250) : 0;
    timers.current.detail = window.setTimeout(() => setDetailIdx(i), delay);
  }

  if (n === 0) {
    return (
      <section className="forge-panel flex h-full flex-col p-5 sm:p-6">
        <h2 className="forge-panel-title">Cartões</h2>
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-faint">
          Cadastre seu cartão para ver limite, fatura e vencimento aqui.
          <Link href="/cartoes" className="t-learn inline-flex min-h-6 items-center gap-0.5 font-medium text-brand">
            Adicionar cartão
            <LearnChevron />
          </Link>
        </div>
      </section>
    );
  }

  const detail = items[detailIdx] ?? items[0];
  const current = detail.summary.current;

  return (
    <section className="forge-panel h-full p-2">
      <div
        ref={rootRef}
        className="wallet"
        data-open={open}
        style={{ "--n": n } as React.CSSProperties}
      >
        <div className="wallet-head flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="balance">
              <span ref={reelRef} className="t-reel" aria-hidden />
              <span ref={liveRef} className="sr-only" aria-live="polite" />
            </span>
            <p className="meta">
              Limite disponível no <span ref={swapRef} className="t-text-swap">{items[front]?.card.name}</span>
            </p>
          </div>
          <Link href="/cartoes" className="t-learn mt-1 inline-flex min-h-6 shrink-0 items-center gap-0.5 text-sm font-medium text-brand">
            Cartões
            <LearnChevron />
          </Link>
        </div>

        <div className="stack t-resize">
          {items.map(({ card }, i) => {
            const bank = findBank(card.name, card.color);
            const face = bank ?? customFace(card.color);
            const p = order.indexOf(i);
            const isFront = i === front;
            return (
              <button
                key={card.id}
                type="button"
                className={`w-card w-card--pattern-${i % 3}${isFront ? " is-front" : ""}`}
                aria-controls="wallet-card-details"
                aria-expanded={isFront ? open : undefined}
                aria-label={
                  isFront ? `Cartão ${card.name}, ${open ? "esconder" : "mostrar"} detalhes` : `Escolher o cartão ${card.name}`
                }
                onClick={() => (isFront ? setOpen((v) => !v) : select(i))}
                style={
                  {
                    "--p": p,
                    zIndex: p + 1,
                    "--card-fg": face.foreground,
                    "--card-muted": face.muted,
                    background: `radial-gradient(90% 120% at 100% 0%, rgba(255,255,255,.18), transparent 60%), radial-gradient(90% 110% at 0% 100%, rgba(0,0,0,.22), transparent 60%), ${face.background}`,
                  } as React.CSSProperties
                }
              >
                <span className="w-row">
                  <span className="w-name">{card.name}</span>
                  <span className="w-type">Crédito</span>
                </span>
                <span className="w-mid" aria-hidden>
                  <span className="w-emv" />
                  <svg className="w-nfc" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" aria-hidden>
                    <path d={NFC_PATH} />
                  </svg>
                </span>
                <span className="w-row w-row--end">
                  <span className="w-num">
                    <span className="w-digits">Vence dia {card.due_day}</span>
                    {holder && <span className="w-holder">{holder}</span>}
                  </span>
                  {bank && bank.name.toLowerCase() !== card.name.trim().toLowerCase() && (
                    <span className="w-brand">{bank.name}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="t-acc" data-open={open}>
          <button
            type="button"
            className="t-acc-head"
            aria-expanded={open}
            aria-controls="wallet-card-details"
            onClick={() => setOpen((v) => !v)}
          >
            Detalhes do cartão
            <span className="t-acc-chevron">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M4.46967 6.46967C4.76256 6.17678 5.23744 6.17678 5.53033 6.46967L8 8.93934L10.4697 6.46967C10.7626 6.17678 11.2374 6.17678 11.5303 6.46967C11.8232 6.76256 11.8232 7.23744 11.5303 7.53033L8.53033 10.5303C8.23744 10.8232 7.76256 10.8232 7.46967 10.5303L4.46967 7.53033C4.17678 7.23744 4.17678 6.76256 4.46967 6.46967Z" />
              </svg>
            </span>
          </button>
          <div className="t-acc-panel" id="wallet-card-details">
            <div className="t-acc-panel-inner">
              <div className="d-row">
                <span className="d-label">Fatura atual</span>
                <span className="d-val">
                  {current ? `${brl(current.total)} · vence ${formatDateBR(current.dueDate).slice(0, 5)}` : "Sem compras"}
                </span>
              </div>
              <div className="d-row">
                <span className="d-label">Limite usado</span>
                <span className="d-val">
                  {brl(detail.summary.used)} de {brl(Number(detail.card.limit_amount))}
                </span>
              </div>
              <div className="d-row">
                <span className="d-label">Fecha / vence</span>
                <span className="d-val">
                  dia {detail.card.closing_day} / dia {detail.card.due_day}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
