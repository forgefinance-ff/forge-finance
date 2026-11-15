"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { replySupport, setSupportStatus } from "@/app/actions/admin-support";
import { Button } from "@/components/ui/button";
import { SUPPORT_MAX_LENGTH } from "@/lib/support-chat";

export function SupportReply({ threadId, status }: { threadId: string; status: "open" | "closed" }) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function send() {
    const text = body.trim();
    if (!text || isPending) return;
    startTransition(async () => {
      const result = await replySupport({ threadId, body: text });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
      ref.current?.focus();
    });
  }

  function toggleStatus() {
    startTransition(async () => {
      const next = status === "open" ? "closed" : "open";
      const result = await setSupportStatus({ threadId, status: next });
      if (!result.ok) toast.error(result.error);
      else toast.success(next === "closed" ? "Conversa marcada como resolvida." : "Conversa reaberta.");
    });
  }

  return (
    <form
      className="space-y-3 border-t border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="support-reply" className="sr-only">
        Resposta
      </label>
      <textarea
        id="support-reply"
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        }}
        rows={3}
        maxLength={SUPPORT_MAX_LENGTH}
        placeholder="Escreva a resposta… (Ctrl + Enter envia)"
        className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={toggleStatus} disabled={isPending}>
          {status === "open" ? "Marcar como resolvida" : "Reabrir conversa"}
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Enviando…" : "Responder"}
        </Button>
      </div>
    </form>
  );
}
