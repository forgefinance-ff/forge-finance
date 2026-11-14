"use client";

import Image from "next/image";
import { BadgeCheck, Mic, Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/use-client-value";

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

/** Mantido por compatibilidade: o visual agora é um só (noite violeta). */
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

export function Bubble({ message }: { message: ChatMessage; theme?: ChatTheme }) {
  const user = message.from === "user";

  return (
    <div className={cn("flex", user ? "justify-end" : "justify-start")}>
      <div className={cn("uv-bubble", user ? "uv-bubble--user" : "uv-bubble--bot")}>
        {!user && (
          <p className="uv-bubble__from">
            Forge <BadgeCheck className="h-3 w-3" aria-hidden />
          </p>
        )}

        {message.audio ? (
          <div className="flex items-center gap-2 py-0.5">
            <span className="uv-play">
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden />
            </span>
            <span className="uv-wave flex h-6 items-center gap-[2px]" aria-label={`Áudio: ${message.audio}`}>
              {WAVE.map((h, i) => (
                <i key={i} style={{ height: h }} />
              ))}
            </span>
            <span className="text-[11px] opacity-80">0:04</span>
          </div>
        ) : (
          message.text && <Rich text={message.text} />
        )}

        {message.bars && (
          <div className="mt-2 space-y-1.5">
            {message.bars.map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[12px] opacity-85">
                  <span>{bar.label}</span>
                  <span className="uv-num">{bar.display}</span>
                </div>
                <div className="uv-bubble__bar">
                  <i style={{ width: `${bar.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="uv-bubble__time uv-num">
          {message.time ?? "agora"} {user && "✓✓"}
        </p>

        {message.buttons && (
          <div className={cn("uv-bubble__buttons", message.buttons.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
            {message.buttons.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- tema reservado para quando o balão tiver variação
export function Typing(_props: { theme?: ChatTheme }) {
  return (
    <div className="flex justify-start" aria-label="Forge está digitando">
      <div className="uv-typing">
        {[0, 1, 2].map((i) => (
          <span key={i} className="animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* A conversa do Forge, sem moldura de aparelho                        */
/* ------------------------------------------------------------------ */

export function Phone({
  children,
  footer,
  className,
}: {
  theme?: ChatTheme;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("uv-chat", className)}>
      <div className="uv-chat__head">
        <Image src="/icon-f.png" alt="" width={32} height={32} className="h-8 w-8" />
        <div className="leading-tight">
          <p className="flex items-center gap-1 text-[14px] font-medium">
            Forge Finance <BadgeCheck className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </p>
          <p className="uv-note">online</p>
        </div>
      </div>
      <div className="uv-chat__body">
        <span className="uv-chat__day">Hoje</span>
        {children}
      </div>
      {footer ?? (
        <div className="uv-chat__foot" aria-hidden>
          <div className="uv-chat__field" />
          <span className="uv-chat__mic">
            <Mic className="h-4 w-4" />
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Conversa que se monta sozinha (em loop)                             */
/* ------------------------------------------------------------------ */


export function AutoChat({
  script,
  theme = "dark",
  className,
}: {
  script: ChatMessage[];
  theme?: ChatTheme;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Só anima quando a conversa aparece na tela.
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
      const t = setTimeout(() => setShown((n) => n + 1), 1300);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => setShown((n) => n + 1), 1100);
    return () => clearTimeout(t);
  }, [shown, script, reduced, visible]);

  const messages = reduced ? script : script.slice(0, shown);
  // "digitando…" enquanto a próxima mensagem do bot não chega.
  const typing = !reduced && visible && shown < script.length && script[shown].from === "bot";

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
