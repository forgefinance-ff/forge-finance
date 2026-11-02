import { z } from "zod";

import { parseInput, ServiceError, type ServiceCtx } from "@/lib/services/context";
import { dateString, id, optionalId, positiveAmount } from "@/lib/services/schemas";

export const transactionInput = z.object({
  account_id: id("Escolha uma conta."),
  category_id: optionalId,
  type: z.enum(["income", "expense"], { message: "Escolha se é receita ou despesa." }),
  description: z
    .union([z.null(), z.undefined(), z.string()])
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= 120, "A descrição pode ter no máximo 120 caracteres."),
  amount: positiveAmount(),
  date: dateString(),
});

export type TransactionInput = z.input<typeof transactionInput>;

/** Cria a transação e ajusta o saldo (função atômica do banco). Retorna o id. */
export async function createTransaction(ctx: ServiceCtx, raw: TransactionInput) {
  const input = parseInput(transactionInput, raw);

  const { data: account } = await ctx.db
    .from("accounts")
    .select("scope")
    .eq("id", input.account_id)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (!account) throw new ServiceError("Conta não encontrada.");
  if (account.scope !== ctx.scope) {
    throw new ServiceError("Esta conta não pertence ao escopo ativo.");
  }

  return (await ctx.atomic("create_transaction", {
    account_id: input.account_id,
    category_id: input.category_id,
    type: input.type,
    title: input.description,
    description: input.description,
    amount: input.amount,
    date: input.date,
  })) as string;
}

/** Estorna o saldo e apaga a transação (função atômica do banco). */
export async function deleteTransaction(ctx: ServiceCtx, transactionId: string) {
  parseInput(id("Transação não encontrada."), transactionId);
  await ctx.atomic("delete_transaction", { id: transactionId });
}
