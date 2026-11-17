"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";
import { MessageCircleMore, X } from "lucide-react";

import { getMySupportThread, sendSupportMessage } from "@/app/actions/support";
import { useReducedMotion } from "@/hooks/use-client-value";
import type { SupportChatMessage } from "@/lib/support-chat";

import { findAnswer } from "./support-answers";
import "./support-chat.css";

/**
 * Balão de suporte a partir do "iMessage Style Chat" (transitions.dev),
 * sem o botão de ligação. Mesma sequência do original: a mensagem entra,
 * o status vai de "Entregue" para "Lida", o suporte digita e responde.
 */

type Msg = {
  id: number;
  side: "in" | "out";
  text: string;
  link?: { href: string; label: string; external?: boolean };
  /** Botão que leva a conversa para a equipe. */
  action?: "human";
  /** Texto do botão de ação. */
  label?: string;
};

type Props = {
  email: string;
  /** WhatsApp de suporte (só dígitos, com DDI). */
  whatsapp?: string | null;
  /** Respostas da equipe que a pessoa ainda não viu. */
  initialUnread?: number;
};

// Tempos do script original.
const READ_AT = 1200;
const TYPING_AT = 1800;
const REPLY_AT = 3400;

const SEED: Msg[] = [
  { id: -2, side: "in", text: "Oi! Sou o suporte do Forge 👋" },
  { id: -1, side: "in", text: "Pergunte o que precisar. Ex.: \"como corrijo um valor?\"" },
];

const POLL_MS = 8000;
const HUMAN_MAX = 1000;

/** Lê uma duração do CSS ("150ms" ou ".15s", o build reescreve) em ms. */
function readMs(el: Element | null, name: string, fallback: number) {
  if (!el) return fallback;
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : n;
}

/** Evento para abrir o balão de qualquer lugar: window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT)). */
export const OPEN_SUPPORT_EVENT = "forge:open-support";

export function SupportBubble({ initialUnread = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(SEED);
  const [newIds, setNewIds] = useState<Set<number>>(() => new Set());
  const [stamp, setStamp] = useState("");
  const [statusFor, setStatusFor] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  // Conversa com a equipe (pessoas de verdade, respondem pelo /admin/suporte).
  const [mode, setMode] = useState<"bot" | "human">("bot");
  const [thread, setThread] = useState<SupportChatMessage[]>([]);
  const [pending, setPending] = useState<{ key: number; text: string; failed?: boolean }[]>([]);
  const [unread, setUnread] = useState(initialUnread);
  const seenServer = useRef<Set<number>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<number>>(() => new Set());
  const lastQuestion = useRef<string>("");

  const pathname = usePathname();
  const reduced = useReducedMotion();
  const uid = useId();
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const chatRef = useRef<HTMLElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const groupRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const tipTextRef = useRef<HTMLSpanElement>(null);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const t = threadRef.current;
      if (t) t.scrollTo({ top: t.scrollHeight, behavior: reduced ? "auto" : "smooth" });
    });
  }, [reduced]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // Outros lugares do app (ex.: atalho da barra lateral) podem abrir o suporte.
  useEffect(() => {
    function onOpen() {
      setStamp(`Hoje ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      setOpen(true);
    }
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  // Abre: hora atual no topo, rola para o fim, foco no campo.
  useEffect(() => {
    if (!open) return;
    const t = threadRef.current;
    if (t) t.scrollTop = t.scrollHeight;
    inputRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        bubbleRef.current?.focus();
      }
    }
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!chatRef.current?.contains(target) && !bubbleRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  // Toque: o botão fica "pressionado" por pelo menos --press-dur (como no original).
  useEffect(() => {
    if (!open) return;
    const chat = chatRef.current;
    if (!chat) return;
    const min = readMs(chat, "--press-dur", 150);
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      const el = (e.target as Element | null)?.closest?.("button") as (HTMLButtonElement & { _tPress?: number }) | null;
      if (!el || el.disabled || !chat?.contains(el)) return;
      const t0 = performance.now();
      clearTimeout(el._tPress);
      el.classList.add("is-pressed");
      const up = () => {
        document.removeEventListener("pointerup", up, true);
        document.removeEventListener("pointercancel", up, true);
        el._tPress = window.setTimeout(() => el.classList.remove("is-pressed"), Math.max(0, min - (performance.now() - t0)));
      };
      document.addEventListener("pointerup", up, true);
      document.addEventListener("pointercancel", up, true);
    }
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /* Tooltip: bolha única, mede o texto e se posiciona (sequência do original). */
  function showTip(trigger: HTMLElement) {
    const tip = tipRef.current;
    const tipText = tipTextRef.current;
    const group = groupRef.current;
    if (!tip || !tipText || !group) return;
    const showing = tip.getAttribute("data-show") === "true";
    tipText.textContent = trigger.getAttribute("data-tooltip") || "";
    const cs = getComputedStyle(tip);
    const width = Math.ceil(tipText.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight));
    const g = group.getBoundingClientRect();
    const r = trigger.getBoundingClientRect();
    let x = r.left - g.left + r.width / 2 - width / 2;
    if (x + width > g.width + 6) x = g.width + 6 - width;
    if (!showing) {
      tip.style.transition = "none";
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
      void tip.offsetWidth;
      tip.style.transition = "";
    } else {
      tip.style.width = `${width}px`;
      tip.style.setProperty("--tt-x", `${x}px`);
    }
    tip.setAttribute("data-show", "true");
    tip.setAttribute("aria-hidden", "false");
  }
  function hideTip() {
    tipRef.current?.setAttribute("data-show", "false");
    tipRef.current?.setAttribute("aria-hidden", "true");
  }

  /* Status: troca de texto com saída e entrada (sequência do original). */
  function swapStatus(next: string) {
    const el = statusRef.current;
    if (!el || el.textContent === next) return;
    el.classList.add("is-exit");
    timers.current.push(
      window.setTimeout(() => {
        el.textContent = next;
        el.classList.remove("is-exit");
        el.classList.add("is-enter-start");
        void el.offsetHeight;
        el.classList.remove("is-enter-start");
      }, readMs(chatRef.current, "--text-swap-dur", 150))
    );
  }

  function push(msg: Omit<Msg, "id">) {
    const id = nextId.current++;
    setMessages((list) => [...list, { ...msg, id }]);
    setNewIds((s) => new Set(s).add(id));
    return id;
  }

  function sendMessage() {
    const question = text.trim();
    if (!question) return;
    clearTimers();
    setTyping(false);

    const outId = push({ side: "out", text: question });
    setStatusFor(outId);
    if (statusRef.current) {
      statusRef.current.classList.remove("is-exit", "is-enter-start");
      statusRef.current.textContent = "Entregue";
    }
    setText("");
    scrollDown();

    const answer = findAnswer(question, pathname);

    timers.current.push(window.setTimeout(() => swapStatus("Lida"), READ_AT));
    timers.current.push(
      window.setTimeout(() => {
        setTyping(true);
        scrollDown();
      }, TYPING_AT)
    );
    timers.current.push(
      window.setTimeout(() => {
        setTyping(false);
        lastQuestion.current = question;
        if (answer) {
          push({ side: "in", text: answer.text });
          if (answer.link) push({ side: "in", text: "", link: answer.link });
          push({ side: "in", text: "", action: "human", label: "Não resolveu? Falar com a equipe →" });
        } else {
          push({ side: "in", text: "Não achei isso nas respostas rápidas. Quer falar com uma pessoa da equipe? Ela responde aqui mesmo." });
          push({ side: "in", text: "", action: "human" });
        }
        scrollDown();
      }, REPLY_AT)
    );
  }

  /* ---------- Conversa com a equipe ---------- */

  const loadThread = useCallback(async (animate = true) => {
    const data = await getMySupportThread();
    if (!data) return null;
    const fresh = data.messages.filter((m) => !seenServer.current.has(m.id)).map((m) => m.id);
    fresh.forEach((id) => seenServer.current.add(id));
    setFreshIds(new Set(animate ? fresh : []));
    setThread(data.messages);
    setUnread(0);
    return data;
  }, []);

  // Ao abrir: se já existe conversa com a equipe, mostra ela.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    loadThread(false).then((data) => {
      if (!alive || !data) return;
      if (data.status === "open" || initialUnread > 0) setMode("human");
      scrollDown();
    });
    return () => {
      alive = false;
    };
  }, [open, loadThread, initialUnread, scrollDown]);

  // Enquanto a conversa com a equipe está aberta, busca respostas novas.
  useEffect(() => {
    if (!open || mode !== "human") return;
    const id = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const before = thread.length;
      const data = await loadThread();
      if (data && data.messages.length !== before) scrollDown();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [open, mode, thread.length, loadThread, scrollDown]);

  async function sendHuman(body: string) {
    const key = Date.now();
    setPending((list) => [...list, { key, text: body }]);
    scrollDown();
    const result = await sendSupportMessage(body, pathname);
    if (!result.ok) {
      setPending((list) => list.map((p) => (p.key === key ? { ...p, failed: true } : p)));
      return;
    }
    await loadThread();
    setPending((list) => list.filter((p) => p.key !== key));
    scrollDown();
  }

  function goHuman() {
    clearTimers();
    setTyping(false);
    setMode("human");
    const question = lastQuestion.current;
    lastQuestion.current = "";
    if (question) void sendHuman(question);
    else inputRef.current?.focus();
  }

  function submit() {
    if (mode === "human") {
      const body = text.trim().slice(0, HUMAN_MAX);
      if (!body) return;
      setText("");
      void sendHuman(body);
      return;
    }
    sendMessage();
  }

  // Remove .is-new quando a entrada termina (como o pop() do original).
  function popDone(id: number) {
    return (e: React.AnimationEvent) => {
      if (e.animationName !== "msg-pop") return;
      setNewIds((s) => {
        if (!s.has(id)) return s;
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    };
  }

  const ready = text.trim().length > 0;

  return (
    <>
      {open && (
        <section
          ref={chatRef}
          id={uid}
          role="dialog"
          aria-label="Conversa com o suporte do Forge Finance"
          className="support-chat support-panel fixed right-4 z-50 md:right-6"
        >
          <header className="bar">
            <span className="bar-avatar">
              {/* eslint-disable-next-line @next/next/no-img-element -- avatar pequeno e local */}
              <img className="avatar-img" src="/logos/forge-logo.png" alt="" width={32} height={32} />
            </span>
            <div className="who">
              <span className="name">{mode === "human" ? "Equipe Forge" : "Suporte Forge"}</span>
              <span className="meta">{mode === "human" ? "Pessoas de verdade · resposta aqui" : "Responde na hora"}</span>
            </div>
            <span className="t-tt-group actions" ref={groupRef} onPointerLeave={hideTip}>
              <button
                type="button"
                className="t-tt-trigger icon-btn"
                data-tooltip="Fechar"
                aria-label="Fechar suporte"
                aria-describedby={`${uid}-tt`}
                onPointerEnter={(e) => showTip(e.currentTarget)}
                onFocus={(e) => showTip(e.currentTarget)}
                onBlur={hideTip}
                onClick={() => {
                  hideTip();
                  setOpen(false);
                  bubbleRef.current?.focus();
                }}
              >
                <X width={16} height={16} strokeWidth={2.25} aria-hidden />
              </button>
              <span className="t-tt" id={`${uid}-tt`} role="tooltip" aria-hidden="true" data-show="false" ref={tipRef}>
                <span className="t-tt-text" ref={tipTextRef} />
              </span>
            </span>
          </header>

          <div className="divider" aria-hidden />

          <div className="thread" ref={threadRef} aria-live="polite">
            <div className="thread-inner">
              <span className="stamp">{stamp}</span>
              {mode === "bot" &&
                messages.map((m) => (
                  <MessageRow
                    key={m.id}
                    msg={m}
                    isNew={newIds.has(m.id)}
                    onAnimationEnd={popDone(m.id)}
                    onLink={() => setOpen(false)}
                    onHuman={goHuman}
                  >
                    {statusFor === m.id && (
                      <div className="status is-new">
                        <span className="t-text-swap" ref={statusRef}>
                          Entregue
                        </span>
                      </div>
                    )}
                  </MessageRow>
                ))}
              {mode === "human" && (
                <>
                  <div className="msg in">
                    Você está falando com a equipe do Forge. Escreva sua dúvida: a resposta chega aqui, normalmente em
                    poucas horas.
                  </div>
                  {thread.map((m) => (
                    <div
                      key={`s${m.id}`}
                      className={`msg ${m.sender === "user" ? "out" : "in"}${freshIds.has(m.id) ? " is-new" : ""}`}
                    >
                      {m.body}
                    </div>
                  ))}
                  {pending.map((p) => (
                    <Fragment key={`p${p.key}`}>
                      <div className="msg out is-new">{p.text}</div>
                      <div className="status">{p.failed ? "Não enviou. Tente de novo." : "Enviando…"}</div>
                    </Fragment>
                  ))}
                  {thread.length > 0 && thread[thread.length - 1].sender === "user" && pending.length === 0 && (
                    <div className="status">Enviada para a equipe</div>
                  )}
                  <button type="button" className="msg in support-back" onClick={() => setMode("bot")}>
                    ← Voltar às respostas rápidas
                  </button>
                </>
              )}
              {mode === "bot" && typing && (
                <div className="msg in typing is-new" aria-label="Suporte está digitando">
                  <i />
                  <i />
                  <i />
                </div>
              )}
            </div>
          </div>

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="field">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={mode === "human" ? "Escreva para a equipe" : "Mensagem"}
                aria-label="Mensagem para o suporte"
                autoComplete="off"
                maxLength={mode === "human" ? HUMAN_MAX : 300}
              />
              <button
                type="button"
                className={`send${ready ? " is-ready" : ""}`}
                aria-label="Enviar"
                aria-disabled={!ready}
                onClick={() => {
                  submit();
                  inputRef.current?.focus();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" aria-hidden="true">
                  <path d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              </button>
            </label>
          </form>
        </section>
      )}

      <button
        ref={bubbleRef}
        type="button"
        onClick={() => {
          if (!open) setStamp(`Hoje ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-controls={open ? uid : undefined}
        aria-label={open ? "Fechar suporte" : unread > 0 ? `Abrir suporte (${unread} resposta nova da equipe)` : "Abrir suporte"}
        className="support-bubble fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 md:right-6"
        data-open={open}
      >
        <span className="support-bubble-icon" data-show={!open} aria-hidden>
          <MessageCircleMore className="h-6 w-6" strokeWidth={2} />
        </span>
        <span className="support-bubble-icon" data-show={open} aria-hidden>
          <X className="h-6 w-6" strokeWidth={2.25} />
        </span>
        {!open && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white ring-2 ring-background">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}

function MessageRow({
  msg,
  isNew,
  onAnimationEnd,
  onLink,
  onHuman,
  children,
}: {
  msg: Msg;
  isNew: boolean;
  onAnimationEnd: (e: React.AnimationEvent) => void;
  onLink: () => void;
  onHuman: () => void;
  children?: React.ReactNode;
}) {
  const cls = `msg ${msg.side}${isNew ? " is-new" : ""}`;
  return (
    <>
      <div className={cls} onAnimationEnd={onAnimationEnd}>
        {msg.action === "human" ? (
          <button type="button" className="support-human-btn" onClick={onHuman}>
            {msg.label ?? "Falar com a equipe →"}
          </button>
        ) : msg.link ? (
          msg.link.external ? (
            <a href={msg.link.href} target={msg.link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
              {msg.link.label} →
            </a>
          ) : (
            <Link href={msg.link.href} onClick={onLink}>
              {msg.link.label} →
            </Link>
          )
        ) : (
          msg.text
        )}
      </div>
      {children}
    </>
  );
}
