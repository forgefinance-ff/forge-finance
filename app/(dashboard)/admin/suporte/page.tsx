import Link from "next/link";
import { MessagesSquare } from "lucide-react";

import { AutoRefresh } from "@/components/admin/auto-refresh";
import { SupportReply } from "@/components/admin/support-reply";
import { getSupportThreads, getThreadMessages } from "@/lib/admin/support";
import { cn } from "@/lib/utils";

const FILTERS = { open: "Abertas", closed: "Resolvidas", all: "Todas" } as const;
type Filter = keyof typeof FILTERS;

function when(value: string) {
  const d = new Date(value);
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const day = d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const time = d.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
  return day === today ? time : `${day.slice(0, 5)} ${time}`;
}

type SearchParams = Promise<{ c?: string; f?: string }>;

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filter: Filter = params.f && params.f in FILTERS ? (params.f as Filter) : "open";
  const threads = await getSupportThreads(filter);

  const selectedId = params.c && /^[0-9a-f-]{36}$/i.test(params.c) ? params.c : threads[0]?.id;
  const selected = selectedId ? (threads.find((t) => t.id === selectedId) ?? null) : null;
  const messages = selected ? await getThreadMessages(selected.id) : [];

  const href = (next: { c?: string; f?: Filter }) => {
    const qs = new URLSearchParams();
    const f = next.f ?? filter;
    if (f !== "open") qs.set("f", f);
    if (next.c) qs.set("c", next.c);
    const s = qs.toString();
    return `/admin/suporte${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={10} />
      <p className="text-sm text-muted-foreground">
        Quando as respostas automáticas do balão não resolvem, a pessoa fala com vocês por aqui. A resposta aparece no
        balão dela. Atualiza sozinho a cada 10 s.
      </p>

      <div className="grid min-h-[560px] overflow-hidden rounded-[22px] border border-line bg-surface md:grid-cols-[320px_1fr]">
        {/* Lista de conversas */}
        <aside className="border-b border-line md:border-b-0 md:border-r">
          <div className="flex gap-1 border-b border-line p-2">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <Link
                key={f}
                href={href({ f })}
                aria-current={filter === f ? "true" : undefined}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-center text-sm",
                  filter === f ? "bg-brand text-white" : "text-muted-foreground hover:bg-tint"
                )}
              >
                {FILTERS[f]}
              </Link>
            ))}
          </div>

          {threads.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma conversa aqui.</p>
          ) : (
            <ul className="max-h-[520px] overflow-y-auto">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={href({ c: t.id })}
                    aria-current={selected?.id === t.id ? "true" : undefined}
                    className={cn(
                      "block border-b border-line/60 px-4 py-3 transition-colors hover:bg-tint",
                      selected?.id === t.id && "bg-tint"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", t.unread_admin > 0 ? "font-semibold text-foreground" : "text-foreground")}>
                        {t.full_name || t.email}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{when(t.last_message_at)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {t.last_sender === "admin" && "Você: "}
                        {t.preview}
                      </span>
                      {t.unread_admin > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">
                          {t.unread_admin}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Conversa aberta */}
        {selected ? (
          <section className="flex min-h-0 flex-col" aria-label={`Conversa com ${selected.email}`}>
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{selected.full_name || selected.email}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {selected.email} · {selected.plan_label}
                  {selected.last_page && <> · escreveu em {selected.last_page}</>}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs",
                  selected.status === "open" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                )}
              >
                {selected.status === "open" ? "Aberta" : "Resolvida"}
              </span>
            </header>

            <ol className="flex max-h-[420px] min-h-[240px] flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-sm", m.sender === "admin" ? "self-end bg-brand text-white" : "self-start bg-tint text-foreground")}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-1 text-[11px]", m.sender === "admin" ? "text-white/70" : "text-muted-foreground")}>
                    {m.sender === "admin" ? `${m.admin_email?.split("@")[0]} · ` : ""}
                    {when(m.created_at)}
                  </p>
                </li>
              ))}
            </ol>

            <SupportReply key={selected.id} threadId={selected.id} status={selected.status} />
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-10 text-center text-muted-foreground">
            <MessagesSquare className="h-8 w-8" aria-hidden />
            <p className="text-sm">Selecione uma conversa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
