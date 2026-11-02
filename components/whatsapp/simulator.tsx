"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SendIcon } from "lucide-react";

import { simulateWhatsapp } from "@/app/actions/whatsapp-sim";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Bubble =
  | { from: "user"; text: string }
  | { from: "bot"; text: string; pendingId?: string; answered?: boolean };

const EXAMPLES = [
  "qual meu saldo?",
  "gastei 45 no mercado",
  "o que vence essa semana?",
  "como está meu limite do MEI?",
];

/** Destaca links (ex.: wa.me da cobrança). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function WhatsappSimulator() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [bubbles, isPending]);

  function send(input: { text?: string; buttonId?: string }, label: string) {
    setBubbles((current) => [...current, { from: "user", text: label }]);

    startTransition(async () => {
      const result = await simulateWhatsapp(input);

      setBubbles((current) => [
        ...current,
        ...(result.ok
          ? result.messages.length
            ? result.messages.map(
                (m): Bubble =>
                  m.kind === "buttons"
                    ? { from: "bot", text: m.body, pendingId: m.pendingId }
                    : { from: "bot", text: m.body }
              )
            : [{ from: "bot" as const, text: "(sem resposta)" }]
          : [{ from: "bot" as const, text: `⚠️ ${result.error}` }]),
      ]);
    });
  }

  function submit() {
    const value = text.trim();
    if (!value || isPending) return;
    setText("");
    send({ text: value }, value);
  }

  function answer(index: number, pendingId: string, action: "confirm" | "cancel") {
    setBubbles((current) =>
      current.map((b, i) => (i === index && b.from === "bot" ? { ...b, answered: true } : b))
    );
    send({ buttonId: `${action}:${pendingId}` }, action === "confirm" ? "✅ Confirmar" : "❌ Cancelar");
  }

  return (
    <section className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-[22px] border border-line bg-surface">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {bubbles.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Converse como no WhatsApp. As ações usam seus dados reais e pedem confirmação.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => send({ text: example }, example)}
                  className="rounded-full border border-line bg-tint px-3 py-1.5 text-xs text-text-soft transition hover:border-brand-bright/40 hover:text-brand-soft"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {bubbles.map((bubble, index) => (
          <div key={index} className={cn("flex", bubble.from === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm",
                bubble.from === "user"
                  ? "rounded-br-md bg-gradient-to-br from-brand to-brand-indigo text-white"
                  : "rounded-bl-md border border-line bg-tint text-foreground"
              )}
            >
              <Linkified text={bubble.text} />

              {bubble.from === "bot" && bubble.pendingId && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={bubble.answered || isPending}
                    onClick={() => answer(index, bubble.pendingId!, "confirm")}
                  >
                    ✅ Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bubble.answered || isPending}
                    onClick={() => answer(index, bubble.pendingId!, "cancel")}
                  >
                    ❌ Cancelar
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-line bg-tint px-4 py-2.5 text-sm text-faint">
              digitando…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <label htmlFor="sim-input" className="sr-only">
          Mensagem
        </label>
        <input
          id="sim-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem…"
          maxLength={1000}
          className="h-11 flex-1 rounded-full border border-line bg-background-soft px-4 text-sm text-foreground outline-none placeholder:text-faint focus:border-brand-bright/50 focus:ring-2 focus:ring-brand-bright/20"
        />
        <Button type="submit" disabled={isPending || !text.trim()} aria-label="Enviar" className="h-11 w-11 rounded-full p-0">
          <SendIcon className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}
