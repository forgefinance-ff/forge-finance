import { NextResponse } from "next/server";
import { z } from "zod";

import { getAiStatus } from "@/lib/ai/config";
import { getCards } from "@/lib/cards";
import { getDashboardData } from "@/lib/dashboard";
import { getGoals } from "@/lib/goals";
import { createClient } from "@/lib/supabase/server";
import { consumeAiQuota } from "@/lib/billing/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(500),
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
  const [dashboard, goals, cards] = await Promise.all([
    getDashboardData(),
    getGoals(),
    getCards(),
  ]);

  const context = {
    hoje: new Date().toISOString().slice(0, 10),
    patrimonio: {
      total: dashboard.totalBalance,
      contas: dashboard.accountsTotal,
      investimentos: dashboard.investmentsTotal,
    },
    mesAtual: {
      receitas: dashboard.analytics.monthIncome,
      despesas: dashboard.analytics.monthExpense,
      despesasMesAnterior: dashboard.analytics.previousMonthExpense,
      despesasPorCategoria: dashboard.analytics.expenseByCategory.map((c) => ({
        categoria: c.name,
        valor: c.value,
      })),
    },
    fluxoUltimos12Meses: dashboard.chart12m,
    metas: goals.map((g) => ({
      titulo: g.title,
      alvo: g.target_amount,
      atual: g.current_amount,
      prazo: g.deadline,
    })),
    cartoes: cards.map((c) => ({
      nome: c.name,
      limite: c.limit_amount,
      diaFechamento: c.closing_day,
      diaVencimento: c.due_day,
    })),
  };

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
        max_tokens: 600,
        system: `${SYSTEM_PROMPT}\n\nContexto (JSON):\n${JSON.stringify(context)}`,
        messages: [{ role: "user", content: parsed.data.question }],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      // Registra só o tipo/mensagem de erro do provedor (sem chave e sem texto do usuário).
      const err = (await response.json().catch(() => null)) as {
        error?: { type?: string; message?: string };
      } | null;
      console.error("AI provider error", response.status, {
        type: err?.error?.type,
        message: err?.error?.message?.slice(0, 300),
      });
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
