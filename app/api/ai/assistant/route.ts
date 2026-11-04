import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiStatus } from "@/lib/ai/config";
import { buildDeepContext, buildQuickContext } from "@/lib/ai/context";
import { createClient } from "@/lib/supabase/server";
import { consumeAiQuota } from "@/lib/billing/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1500),
  /** "quick": caixa do dashboard; "deep": aba do Assistente (respostas completas). */
  mode: z.enum(["quick", "deep"]).default("quick"),
  /** Conversa anterior da aba do Assistente (só texto, limitado). */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(6000),
      })
    )
    .max(10)
    .default([]),
});

// Limite simples por usuário (em memória, por instância). Em produção com
// várias instâncias, troque por um limitador compartilhado (ex.: Redis/Upstash).
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 6;
const hits = new Map<string, number[]>();

function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

const SYSTEM_PROMPT = `Você é o assistente do Forge Finance. Responda em português do Brasil, de forma curta e objetiva.
Use SOMENTE os dados do contexto JSON fornecido. Se o contexto não tiver a informação pedida, diga isso claramente em vez de supor.
Você só consulta: não registra, altera nem apaga nada, e não executa transferências. Se o usuário pedir uma ação, explique que ela deve ser feita pela interface do app.
Valores monetários estão em reais (BRL).`;

const DEEP_PROMPT = `Você é o analista financeiro do Forge Finance. Responda em português do Brasil.
Use SOMENTE os dados do contexto JSON. Se algo não estiver no contexto, diga claramente; nunca invente números.
Faça análises completas: compare meses, aponte tendências, categorias que mais pesam, riscos (contas atrasadas, cartões, limite do MEI) e oportunidades concretas de economia.
Mostre as contas que fizer (ex.: média, diferença, percentual) para o usuário conferir.
Organize a resposta com títulos curtos e listas quando ajudar. Termine com 2 ou 3 próximos passos práticos.
Aportes, empréstimos e reembolsos não são receita nem despesa: trate-os à parte.
Você só consulta: não registra, altera nem apaga nada. Se pedirem uma ação, explique onde fazer no app.
Você não é contador nem consultor de investimentos: em temas fiscais ou de investimento, oriente de forma geral e sugira procurar um profissional.
Valores em reais (BRL).`;

export async function POST(request: Request) {
  const ai = getAiStatus();

  if (!ai.configured) {
    return NextResponse.json(
      { error: "A IA não está configurada neste ambiente." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Pergunta inválida." }, { status: 400 });
  }

  if (rateLimited(user.id)) {
    return NextResponse.json(
      { error: "Muitas perguntas seguidas. Aguarde um minuto." },
      { status: 429 }
    );
  }

  // A cota mensal é aplicada atomicamente no PostgreSQL, não no navegador.
  const quota = await consumeAiQuota();
  if (!quota) {
    return NextResponse.json(
      { error: "Não foi possível validar sua cota de IA. Tente novamente." },
      { status: 503 }
    );
  }
  if (!quota.allowed) {
    return NextResponse.json(
      { error: "Você atingiu a cota mensal de consultas do Forge Intelligence." },
      { status: 429, headers: { "X-AI-Quota-Limit": String(quota.monthlyLimit), "X-AI-Quota-Remaining": "0" } }
    );
  }

  // Contexto agregado, lido com o cliente do próprio usuário (RLS aplicado).
  // Não enviamos descrições de transações individuais ao provedor.
  const deep = parsed.data.mode === "deep";
  const context = deep ? await buildDeepContext() : await buildQuickContext();

  // A API exige alternância usuário/assistente começando pelo usuário.
  const history: { role: "user" | "assistant"; content: string }[] = [];
  if (deep) {
    for (const message of parsed.data.history) {
      const expected = history.length % 2 === 0 ? "user" : "assistant";
      if (message.role === expected && message.content.trim()) history.push(message);
    }
    if (history.length % 2 === 1) history.pop();
  }

  const messages = [
    ...history,
    { role: "user" as const, content: parsed.data.question },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ai.model,
        max_tokens: deep ? 2000 : 600,
        system: `${deep ? DEEP_PROMPT : SYSTEM_PROMPT}\n\nContexto (JSON):\n${JSON.stringify(context)}`,
        messages,
      }),
      signal: AbortSignal.timeout(deep ? 55_000 : 25_000),
    });

    if (!response.ok) {
      console.error("AI provider error", response.status);
      return NextResponse.json(
        { error: "O provedor de IA retornou um erro. Tente novamente." },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };

    const answer = (payload.content ?? [])
      .filter((block) => block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n")
      .trim();

    if (!answer) {
      return NextResponse.json(
        { error: "Resposta vazia do provedor." },
        { status: 502 }
      );
    }

    return NextResponse.json({ answer, quota: { used: quota.used, limit: quota.monthlyLimit, remaining: quota.remaining } });
  } catch (error) {
    console.error("AI request failed", error);
    return NextResponse.json(
      { error: "Não foi possível consultar a IA agora." },
      { status: 502 }
    );
  }
}
