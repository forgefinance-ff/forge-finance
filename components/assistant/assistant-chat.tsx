"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon, RotateCcwIcon, SendIcon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { StandardQuestion } from "@/lib/ai/questions";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  configured: boolean;
  questions: StandardQuestion[];
};

/** Negrito simples (**texto**) sem HTML. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Mostra títulos, listas e parágrafos da resposta (markdown básico). */
function Answer({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={`l${blocks.length}`}
        className={cn("space-y-1 pl-5", list.ordered ? "list-decimal" : "list-disc")}
      >
        {list.items.map((item, i) => (
          <li key={i}>
            <Inline text={item} />
          </li>
        ))}
      </Tag>
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)/);
    const heading = line.match(/^#{1,4}\s+(.*)/);

    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flush();
      list = list ?? { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }

    flush();
    if (!line.trim()) continue;

    if (heading) {
      blocks.push(
        <p key={`h${blocks.length}`} className="pt-1 font-semibold text-foreground">
          <Inline text={heading[1].replace(/\*\*/g, "")} />
        </p>
      );
    } else {
      blocks.push(
        <p key={`p${blocks.length}`}>
          <Inline text={line} />
        </p>
      );
    }
  }
  flush();

  return <div className="space-y-2">{blocks}</div>;
}

export function AssistantChat({ configured, questions }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; limit: number } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history = messages.slice(-8);
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, mode: "deep", history }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
        quota?: { remaining: number; limit: number };
      };

      if (!response.ok || !payload.answer) {
        setError(payload.error ?? "Não foi possível obter uma resposta agora.");
        // Tira a pergunta sem resposta para não quebrar a conversa.
        setMessages((current) => current.slice(0, -1));
        setInput(trimmed);
      } else {
        setMessages((current) => [...current, { role: "assistant", content: payload.answer! }]);
        if (payload.quota) setQuota(payload.quota);
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setMessages((current) => current.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <section className="rounded-[22px] border border-dashed border-line-strong bg-surface p-8 text-center">
        <p className="font-semibold text-foreground">Assistente desativado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina <code className="text-brand-soft">ANTHROPIC_API_KEY</code> nas variáveis de
          ambiente do servidor para ativar a IA.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex min-h-[520px] flex-col overflow-hidden rounded-[22px] border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SparklesIcon className="h-4 w-4 text-brand-soft" />
            Conversa
          </p>
          <div className="flex items-center gap-3">
            {quota && (
              <span className="text-xs text-faint">
                {quota.remaining} de {quota.limit} consultas restantes no mês
              </span>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setError(null);
                }}
                className="flex items-center gap-1 text-xs text-faint transition hover:text-text-soft"
              >
                <RotateCcwIcon className="h-3.5 w-3.5" />
                Nova conversa
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <SparklesIcon className="h-8 w-8 text-brand-soft" />
              <p className="font-medium text-foreground">Pergunte o que quiser sobre suas finanças</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Escreva com detalhes (período, categorias, objetivo) ou use uma das perguntas
                prontas ao lado.
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "rounded-br-md bg-gradient-to-br from-brand to-brand-indigo text-white"
                    : "rounded-bl-md border border-line bg-tint text-text-soft"
                )}
              >
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <Answer text={message.content} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-tint px-4 py-3 text-sm text-faint">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Analisando seus dados…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {error && (
          <p role="alert" className="mx-5 mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            ask(input);
          }}
          className="flex gap-2 border-t border-line p-3"
        >
          <label htmlFor="assistant-input" className="sr-only">
            Pergunta
          </label>
          <textarea
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            maxLength={1500}
            placeholder="Ex.: compare meus gastos com mercado e restaurantes nos últimos 3 meses e diga onde economizar"
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-line bg-background-soft px-4 py-3 text-sm text-foreground outline-none placeholder:text-faint focus:border-brand-bright/50"
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Enviar pergunta"
            className="h-auto self-stretch px-4"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </form>
      </section>

      <aside className="space-y-3 rounded-[22px] border border-line bg-surface p-5">
        <p className="text-sm font-semibold text-foreground">Perguntas prontas</p>
        <div className="flex flex-col gap-2">
          {questions.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={loading}
              onClick={() => ask(item.question)}
              title={item.question}
              className="rounded-xl border border-line bg-tint px-3 py-2.5 text-left text-sm text-text-soft transition hover:border-brand-bright/40 hover:text-brand-soft disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
