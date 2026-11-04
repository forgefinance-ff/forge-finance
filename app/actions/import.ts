"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import { errorMessage } from "@/lib/services/context";
import { createTransaction } from "@/lib/services/transactions";

export type ImportRowInput = {
  date: string;
  description: string;
  amount: number; // sempre positivo
  type: "income" | "expense";
  category_id: string;
};

export type ImportResult =
  | { ok: true; created: number; failed: { index: number; error: string }[] }
  | { ok: false; error: string };

export type ExistingTransaction = {
  date: string;
  amount: number;
  type: "income" | "expense";
  description: string;
};

const MAX_ROWS = 500;

/** Lançamentos que já existem na conta no período, para marcar duplicados. */
export async function findExistingTransactions(
  accountId: string,
  from: string,
  to: string
): Promise<ExistingTransaction[]> {
  try {
    const ctx = await appCtx();
    const { data, error } = await ctx.db
      .from("transactions")
      .select("transaction_date, amount, type, description")
      .eq("user_id", ctx.userId)
      .eq("account_id", accountId)
      .gte("transaction_date", from)
      .lte("transaction_date", to);

    if (error) return [];

    return (data ?? []).map((t) => ({
      date: String(t.transaction_date).slice(0, 10),
      amount: Number(t.amount),
      type: t.type as "income" | "expense",
      description: String(t.description ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Cria as transações do extrato, uma a uma (cada uma ajusta o saldo da conta). */
export async function importTransactions(
  accountId: string,
  rows: ImportRowInput[]
): Promise<ImportResult> {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Nenhum lançamento selecionado." };
  }
  if (rows.length > MAX_ROWS) {
    return { ok: false, error: `Importe no máximo ${MAX_ROWS} lançamentos por vez.` };
  }

  let ctx;
  try {
    ctx = await appCtx();
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Sua sessão expirou. Entre novamente.") };
  }

  let created = 0;
  const failed: { index: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    try {
      await createTransaction(ctx, {
        account_id: accountId,
        category_id: row.category_id || null,
        type: row.type,
        description: String(row.description ?? "").slice(0, 120),
        amount: Math.abs(Number(row.amount)),
        date: row.date,
      });
      created++;
    } catch (error) {
      failed.push({ index, error: errorMessage(error, "Não foi possível importar.") });
    }
  }

  if (created > 0) {
    revalidatePath("/transacoes");
    revalidatePath("/contas");
    revalidatePath("/dashboard");
    revalidatePath("/relatorios");
  }

  return { ok: true, created, failed };
}
