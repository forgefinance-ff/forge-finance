"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import gsap from "gsap";

import { cn } from "@/lib/utils";

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* ── Stretchy pill ────────────────────────────────────────────────
   One pill covers the whole container and is cut down to the active
   item with clip-path. On change, the leading edge races ahead
   (0.36s, power3.out) and the trailing edge catches up later
   (0.55s, power3.inOut), so the pill stretches and settles like a
   drop of liquid. Works horizontally and vertically. The active item
   carries data-active="true"; the container must be `relative`.
   First paint and resizes are instant. */
type Edges = { t: number; r: number; b: number; l: number; rad: number };

export function useSlidingPill<C extends HTMLElement>(
  activeKey: unknown,
  options: { radius?: number } = {}
) {
  const fixedRadius = options.radius;
  const containerRef = useRef<C>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const state = useRef<Edges | null>(null);

  useIsoLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (!container || !pill) return;

    const paint = () => {
      const s = state.current;
      if (!s) return;
      pill.style.clipPath = `inset(${s.t}px ${s.r}px ${s.b}px ${s.l}px round ${s.rad}px)`;
    };

    const measure = (): Edges | null => {
      const active = container.querySelector<HTMLElement>('[data-active="true"]');
      if (!active) return null;
      const c = container.getBoundingClientRect();
      const a = active.getBoundingClientRect();
      if (a.width === 0 && a.height === 0) return null;
      return {
        t: a.top - c.top,
        l: a.left - c.left,
        r: c.right - a.right,
        b: c.bottom - a.bottom,
        rad: fixedRadius ?? Math.min(a.width, a.height) / 2,
      };
    };

    const go = (instant: boolean) => {
      const to = measure();
      if (!to) {
        pill.style.opacity = "0";
        return;
      }
      pill.style.opacity = "1";
      const st = state.current;
      if (st) gsap.killTweensOf(st);

      if (!st || instant || prefersReducedMotion()) {
        state.current = { ...to };
        paint();
        return;
      }

      const down = to.t > st.t;
      const right = to.l > st.l;
      const lead: Partial<Edges> = { rad: to.rad };
      const trail: Partial<Edges> = {};
      (down ? lead : trail).b = to.b;
      (down ? trail : lead).t = to.t;
      (right ? lead : trail).r = to.r;
      (right ? trail : lead).l = to.l;

      gsap.to(st, { ...lead, duration: 0.36, ease: "power3.out", onUpdate: paint });
      gsap.to(st, { ...trail, duration: 0.55, ease: "power3.inOut", onUpdate: paint });
    };

    go(false);

    // ResizeObserver also fires once right after observe(); skip that one
    // so it doesn't cut the animation that just started.
    let skipFirst = true;
    const observer = new ResizeObserver(() => {
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      go(true);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeKey, fixedRadius]);

  return { containerRef, pillRef };
}

export function TabsPill({
  pillRef,
  className,
}: {
  pillRef: React.RefObject<HTMLSpanElement | null>;
  className?: string;
}) {
  return (
    <span
      ref={pillRef}
      aria-hidden
      className={cn("t-stretch-pill", className ?? "bg-text")}
      style={{ opacity: 0 }}
    />
  );
}

/** Path the user just clicked, so the pill moves on click instead of after
 *  the next page has loaded. Falls back to the real path once it changes. */
export function useOptimisticPath(pathname: string) {
  const [target, setTarget] = useState(pathname);
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setTarget(pathname);
  }
  return [target, setTarget] as const;
}

/* ── Text swap soft ────────────────────────────────────────────────
   Old and new text share one grid cell and cross-blur in place while
   the cell width eases between them. */
export function SoftText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [shown, setShown] = useState(text);
  const [next, setNext] = useState<string | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (text === shown && next === null) return;
    if (text === (next ?? shown)) return;
    const el = ref.current;
    if (!el || prefersReducedMotion()) {
      setShown(text);
      setNext(null);
      return;
    }
    el.style.width = `${el.offsetWidth}px`;
    setNext(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useIsoLayoutEffect(() => {
    if (next === null) return;
    const el = ref.current;
    if (!el) return;
    const incoming = el.querySelector<HTMLElement>(".t-text-soft-new");
    void el.offsetWidth;
    el.classList.add("is-swapping");
    if (incoming) el.style.width = `${incoming.offsetWidth}px`;

    const timer = window.setTimeout(() => {
      el.classList.remove("is-swapping");
      el.style.width = "";
      setShown(next);
      setNext(null);
    }, 240);

    return () => {
      window.clearTimeout(timer);
      el.classList.remove("is-swapping");
    };
  }, [next]);

  return (
    <span ref={ref} className={cn("t-text-soft", className)}>
      <span className="t-text-soft-old">{shown}</span>
      {next !== null && (
        <span className="t-text-soft-new" aria-hidden>
          {next}
        </span>
      )}
    </span>
  );
}

/* ── Streaming text ────────────────────────────────────────────────
   Words fade in one after another. Used for fresh assistant replies. */
export function StreamWords({
  text,
  gap = 60,
  render,
}: {
  text: string;
  gap?: number;
  render?: (visibleText: string) => ReactNode;
}) {
  const words = text.split(/(\s+)/);
  const [count, setCount] = useState(() => (prefersReducedMotion() ? words.length : 0));

  useEffect(() => {
    if (count >= words.length) return;
    const timer = window.setTimeout(() => setCount((c) => c + 2), gap);
    return () => window.clearTimeout(timer);
  }, [count, words.length, gap]);

  if (count >= words.length && render) return <>{render(text)}</>;

  return (
    <p className="whitespace-pre-wrap">
      {words.map((word, index) =>
        /\s+/.test(word) ? (
          word
        ) : (
          <span
            key={index}
            className={cn("t-stream-w", index < count && "is-in")}
          >
            {word}
          </span>
        )
      )}
    </p>
  );
}

/* ── Success check ───────────────────────────────────────────────── */
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <span className={cn("t-success-check", className)} data-state="in">
      <svg viewBox="0 0 48 48" fill="none" width="56" height="56">
        <circle cx="24" cy="24" r="22" className="fill-success/15" />
        <path
          d="M15 24.5l6 6 12-13"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ── Error shake ───────────────────────────────────────────────────
   One global listener: any form field that fails native validation
   shakes once. Mounted in the root layout. */
export function InvalidShake() {
  useEffect(() => {
    const onInvalid = (event: Event) => {
      const el = event.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLElement)) return;
      el.classList.add("t-input");
      el.classList.remove("is-shaking");
      void el.offsetWidth;
      el.classList.add("is-shaking");
      const done = () => {
        el.classList.remove("is-shaking");
        el.removeEventListener("animationend", done);
      };
      el.addEventListener("animationend", done);
    };
    document.addEventListener("invalid", onInvalid, true);
    return () => document.removeEventListener("invalid", onInvalid, true);
  }, []);

  return null;
}

/* ── Texts reveal ──────────────────────────────────────────────────
   Adds .is-shown on the next frame so the staggered lines rise in. */
export function StaggerReveal({
  as: Tag = "div",
  className,
  children,
  onView = false,
}: {
  as?: "div" | "header" | "section";
  className?: string;
  children: ReactNode;
  /** Reveal when scrolled into view instead of on mount. */
  onView?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => el.classList.add("is-shown");
    if (!onView || prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(show);
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          show();
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onView]);
  return (
    <Tag ref={ref} className={cn("t-stagger", className)}>
      {children}
    </Tag>
  );
}

/* ── Learn more chevron ──────────────────────────────────────────── */
export function LearnChevron({ className }: { className?: string }) {
  return (
    <span className={cn("t-learn-chevron", className)} aria-hidden>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          className="t-learn-arm t-learn-arm-top"
          d="M6 4L10 8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          className="t-learn-arm t-learn-arm-bot"
          d="M10 8L6 12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/* ── Reveal on scroll (07-panel-reveal) ────────────────────────────
   The block rises 18px, fades and un-blurs once it scrolls into view.
   Children marked .t-reveal-item (with style --i) cascade after it. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // data-open is written straight on the element: no re-render needed.
    const open = () => {
      el.dataset.open = "true";
    };
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      open();
      return;
    }
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          timer = window.setTimeout(open, delay);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [delay]);

  return (
    <div ref={ref} data-open="false" className={cn("t-panel-slide t-reveal empty:hidden", className)}>
      {children}
    </div>
  );
}

/* ── Number pop-in (02-number-pop-in) ──────────────────────────────
   On mount each digit rises on its own drum, staggered left to right;
   symbols (R$, dots, commas) stay still. Text stays readable by screen
   readers through the visually hidden copy. */
export function PopNumber({
  value,
  className,
  startDelay = 0,
}: {
  value: string;
  className?: string;
  /** ms before the first digit moves. */
  startDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    el.classList.remove("is-animating");
    void el.offsetWidth;
    el.classList.add("is-animating");
  }, [value]);

  let digit = 0;
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="sr-only">{value}</span>
      <span
        ref={ref}
        aria-hidden
        className="t-digit-group"
        style={{ "--digit-enter-delay": `${startDelay}ms` } as React.CSSProperties}
      >
        {[...value].map((ch, index) =>
          /\d/.test(ch) ? (
            <span
              key={`${index}-${ch}`}
              className="t-digit"
              style={{ "--digit-i": digit++ } as React.CSSProperties}
            >
              {ch}
            </span>
          ) : (
            <span key={`${index}-${ch}`} className="t-digit" data-same>
              {ch === " " ? " " : ch}
            </span>
          )
        )}
      </span>
    </span>
  );
}

/* ── Thinking → message (28-thinking-states + 30-streaming-text) ────
   The first time per session the Forge "reads" the month: a shimmering
   status line, then the message streams in word by word. */
export function ThinkThenStream({
  text,
  thinking = "Lendo seus números…",
  className,
}: {
  text: string;
  thinking?: string;
  className?: string;
}) {
  const [phase, setPhase] = useState<"think" | "stream" | "done">("done");

  useIsoLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem("forge-bubble-seen") === "1";
      sessionStorage.setItem("forge-bubble-seen", "1");
    } catch {}
    if (seen) return;
    setPhase("think");
    const timer = window.setTimeout(() => setPhase("stream"), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  if (phase === "think") {
    return (
      <p className={className} role="status">
        <span className="t-shimmer t-page-reveal [--shimmer-base:color-mix(in_oklab,white_65%,transparent)] [--shimmer-highlight:white]" data-text={thinking}>
          {thinking}
        </span>
      </p>
    );
  }
  if (phase === "stream") {
    return (
      <div className={className}>
        <StreamWords text={text} gap={45} />
      </div>
    );
  }
  return <p className={className}>{text}</p>;
}
