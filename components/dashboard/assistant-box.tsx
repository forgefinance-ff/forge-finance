"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";

type AssistantBoxProps = {
  configured: boolean;
};

export function AssistantBox({ configured }: AssistantBoxProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok || !payload.answer) {
        setError(payload.error ?? "Não foi possível obter uma resposta agora.");
      } else {
        setAnswer(payload.answer);
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div>
        <p className="text-xs font-semibold text-foreground">Assistente de IA</p>
        <p className="mt-1 text-[11px] leading-relaxed text-faint">
          Desativado. Para ativar, defina <code className="text-brand-soft">ANTHROPIC_API_KEY</code>{" "}
          nas variáveis de ambiente do servidor. Até lá, nenhuma resposta de IA é
          exibida.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-foreground">Pergunte sobre suas finanças</p>
      <p className="mt-0.5 text-[11px] text-faint">
        Somente consultas. O assistente não altera seus registros.
      </p>

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="Quanto gastei com transporte este mês?"
          aria-label="Pergunta para o assistente"
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-black/30 px-3 text-xs text-foreground outline-none placeholder:text-faint focus:border-brand-bright/50"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          aria-label="Enviar pergunta"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-bright disabled:opacity-40"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>

      {loading && <p className="mt-3 text-xs text-faint">Analisando seus dados…</p>}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      {answer && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-tint px-3 py-2.5 text-xs leading-relaxed text-foreground">
          {answer}
        </p>
      )}
    </div>
  );
}
