import { NextResponse } from "next/server";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/totals";

export const dynamic = "force-dynamic";

/** Tabelas com dados do próprio usuário (lidas com RLS: só o que é dele). */
const TABLES = [
  "profiles",
  "accounts",
  "categories",
  "cards",
  "transactions",
  "goals",
  "budgets",
  "investments",
  "payables",
  "customers",
  "mei_settings",
  "mei_das_payments",
  "notification_prefs",
  "user_entitlements",
  "usage_records",
] as const;

/**
 * "Baixar meus dados" (LGPD, art. 18): um arquivo JSON com tudo o que o
 * Forge guarda sobre a pessoa.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const supabase = await createClient();
  const data: Record<string, unknown> = {};

  for (const table of TABLES) {
    const column = table === "profiles" ? "id" : "user_id";
    try {
      data[table] = await fetchAllRows(
        (a, b) => supabase.from(table).select("*").eq(column, user.id).range(a, b),
        { max: 100_000 }
      );
    } catch {
      data[table] = { erro: "Não foi possível ler esta parte agora." };
    }
  }

  const body = JSON.stringify(
    {
      gerado_em: new Date().toISOString(),
      conta: { id: user.id, email: user.email ?? null },
      observacao: "Exportação dos seus dados no Forge Finance. Valores em reais (BRL).",
      dados: data,
    },
    null,
    2
  );

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="forge-finance-meus-dados-${date}.json"`,
      "cache-control": "no-store",
    },
  });
}
