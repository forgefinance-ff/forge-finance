"use client";

import Image from "next/image";
import { BadgeCheck, Mic, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type ChatMessage = {
  from: "user" | "bot";
  text?: string;
  /** Áudio do usuário (mostra a onda em vez de texto). */
  audio?: string;
  /** Barras simples dentro da resposta do bot. */
  bars?: { label: string; value: number; display: string }[];
  /** Botões do WhatsApp na resposta do bot. */
  buttons?: string[];
  time?: string;
};

export type ChatTheme = "dark" | "light";

/* ------------------------------------------------------------------ */
/* Bolhas                                                              */
/* ------------------------------------------------------------------ */

/** *negrito* no estilo WhatsApp e quebras de linha. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line === "" ? (
          <span key={i} className="block h-2" />
        ) : (
        <span key={i} className="block">
          {line.split(/(\*[^*]+\*)/g).map((part, j) =>
            part.startsWith("*") && part.endsWith("*") ? (
              <strong key={j} className="font-semibold">
                {part.slice(1, -1)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </span>
        )
      )}
    </>
  );
}

const WAVE = [5, 9, 14, 8, 12, 16, 10, 6, 13, 15, 9, 5, 11, 14, 8, 12, 6, 10, 15, 7];

export function Bubble({ message, theme = "dark" }: { message: ChatMessage; theme?: ChatTheme }) {
  const dark = theme === "dark";
  const user = message.from === "user";

  return (
    <div className={cn("flex", user ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[86%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm",
          user
            ? dark
              ? "rounded-br-md bg-[#144d37] text-[#e9fbe9]"
              : "rounded-br-md bg-[#d9fdd3] text-[#111b21]"
            : dark
              ? "rounded-bl-md border border-white/[0.06] bg-[#1c1a27] text-[#ece9f6]"
              : "rounded-bl-md bg-white text-[#111b21]"
        )}
      >
        {!user && (
          <p className={cn("mb-1 flex items-center gap-1 text-[11px] font-semibold", dark ? "text-violet-300" : "text-violet-700")}>
            Forge <BadgeCheck className="h-3 w-3" />
          </p>
        )}

        {message.audio ? (
          <div className="flex items-center gap-2 py-0.5">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full", dark ? "bg-white/90" : "bg-[#00a884]")}>
              <Play className={cn("ml-0.5 h-3.5 w-3.5", dark ? "fill-[#144d37] text-[#144d37]" : "fill-white text-white")} />
            </span>
            <span className="flex h-6 items-center gap-[2px]">
              {WAVE.map((h, i) => (
                <i key={i} className={cn("block w-[3px] rounded-full", dark ? "bg-white/70" : "bg-[#54656f]")} style={{ height: h }} />
              ))}
            </span>
            <span className={cn("text-[11px]", dark ? "text-white/70" : "text-[#54656f]")}>0:04</span>
          </div>
        ) : (
          message.text && <Rich text={message.text} />
        )}

        {message.bars && (
          <div className="mt-2 space-y-1.5">
            {message.bars.map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[11px] opacity-80">
                  <span>{bar.label}</span>
                  <span>{bar.display}</span>
                </div>
                <div className={cn("mt-0.5 h-1.5 rounded-full", dark ? "bg-white/10" : "bg-black/[0.06]")}>
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400" style={{ width: `${bar.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className={cn("mt-1 text-right text-[10px]", user ? (dark ? "text-white/50" : "text-[#667781]") : dark ? "text-white/40" : "text-[#667781]")}>
          {message.time ?? "agora"} {user && "✓✓"}
        </p>

        {message.buttons && (
          <div className={cn("-mx-3 mt-2 grid border-t", message.buttons.length > 1 ? "grid-cols-2" : "grid-cols-1", dark ? "border-white/10" : "border-black/10")}>
            {message.buttons.map((label) => (
              <span key={label} className={cn("py-1.5 text-center text-[12px] font-medium", dark ? "text-sky-300" : "text-[#027eb5]")}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Typing({ theme = "dark" }: { theme?: ChatTheme }) {
  return (
    <div className="flex justify-start">
      <div className={cn("flex gap-1 rounded-2xl rounded-bl-md px-3 py-3", theme === "dark" ? "bg-[#1c1a27]" : "bg-white")}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Celular                                                             */
/* ------------------------------------------------------------------ */

export function Phone({
  theme = "dark",
  children,
  footer,
  className,
}: {
  theme?: ChatTheme;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const dark = theme === "dark";

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[320px] rounded-[2.6rem] border-solid p-0 shadow-2xl",
        dark ? "bg-[#0b141a] shadow-violet-900/30" : "bg-[#efeae2] shadow-black/20",
        className
      )}
      style={{ borderWidth: 10, borderColor: dark ? "#1b1a22" : "#16141c" }}
    >
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
      <div className={cn("flex items-center gap-2 rounded-t-[2rem] px-4 pb-2 pt-9", dark ? "bg-[#14121c]" : "bg-[#f0f2f5]")}>
        <Image src="/icon-f.png" alt="" width={28} height={28} className="h-7 w-7 rounded-full bg-[#120f1f] p-1" />
        <div className="leading-tight">
          <p className={cn("flex items-center gap-1 text-[13px] font-semibold", dark ? "text-white" : "text-[#111b21]")}>
            Forge Finance <BadgeCheck className="h-3.5 w-3.5 text-sky-400" />
          </p>
          <p className={cn("text-[11px]", dark ? "text-white/50" : "text-[#667781]")}>online</p>
        </div>
      </div>
      <div className={cn("flex h-[440px] flex-col justify-end gap-2 overflow-hidden px-3 pb-3 pt-2", dark ? "bg-[#0b0a12]" : "bg-[#efeae2]")}>
        {children}
      </div>
      {footer ?? (
        <div className={cn("flex items-center gap-2 rounded-b-[2rem] px-3 pb-4 pt-2", dark ? "bg-[#14121c]" : "bg-[#f0f2f5]")}>
          <div className={cn("h-8 flex-1 rounded-full", dark ? "bg-white/[0.06]" : "bg-white")} />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a884]">
            <Mic className="h-4 w-4 text-white" />
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conversa que se monta sozinha (em loop)                             */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
  }, []);
  return reduced;
}

export function AutoChat({
  script,
  theme = "dark",
  className,
}: {
  script: ChatMessage[];
  theme?: ChatTheme;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(1);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Só anima quando o celular aparece na tela.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !visible) return;

    if (shown >= script.length) {
      const restart = setTimeout(() => setShown(1), 4500);
      return () => clearTimeout(restart);
    }

    const next = script[shown];
    if (next.from === "bot") {
      setTyping(true);
      const t = setTimeout(() => {
        setTyping(false);
        setShown((n) => n + 1);
      }, 1300);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setShown((n) => n + 1), 1100);
    return () => clearTimeout(t);
  }, [shown, script, reduced, visible]);

  const messages = reduced ? script : script.slice(0, shown);

  return (
    <div ref={ref} className={className}>
      <Phone theme={theme}>
        {messages.map((message, i) => (
          <div key={`${shown > i ? i : "x"}-${i}`} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Bubble message={message} theme={theme} />
          </div>
        ))}
        {typing && <Typing theme={theme} />}
      </Phone>
    </div>
  );
}
