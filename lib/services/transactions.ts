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

export const cardPurchaseInput = z.object({
  card_id: id("Escolha um cartão."),
  category_id: optionalId,
  type: z.enum(["income", "expense"], { message: "Escolha se é compra ou estorno." }),
  description: z
    .union([z.null(), z.undefined(), z.string()])
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= 120, "A descrição pode ter no máximo 120 caracteres."),
  amount: positiveAmount(),
  date: dateString(),
  installments: z.coerce
    .number()
    .int("Parcelas deve ser um número inteiro.")
    .min(1, "Pelo menos 1 parcela.")
    .max(48, "No máximo 48 parcelas.")
    .default(1),
});

export type CardPurchaseInput = z.input<typeof cardPurchaseInput>;

async function requireCard(ctx: ServiceCtx, cardId: string) {
  const { data: card } = await ctx.db
    .from("cards")
    .select("id, name, scope")
    .eq("id", cardId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (!card) throw new ServiceError("Cartão não encontrado.");
  if (card.scope !== ctx.scope) {
    throw new ServiceError("Este cartão não pertence ao escopo ativo.");
  }
  return card as { id: string; name: string; scope: string };
}

/**
 * Compra (ou estorno) no cartão de crédito: é despesa na data da compra, mas
 * não mexe em saldo de conta. Parcelada: uma despesa por mês.
 */
export async function createCardPurchase(ctx: ServiceCtx, raw: CardPurchaseInput) {
  const input = parseInput(cardPurchaseInput, raw);
  await requireCard(ctx, input.card_id);

  return (await ctx.atomic("create_card_purchase", {
    card_id: input.card_id,
    category_id: input.category_id,
    type: input.type,
    title: input.description,
    amount: input.amount,
    date: input.date,
    installments: input.type === "income" ? 1 : input.installments,
  })) as string;
}

export const invoicePaymentInput = z.object({
  card_id: id("Escolha um cartão."),
  account_id: id("Escolha a conta que paga a fatura."),
  amount: positiveAmount(),
  date: dateString(),
  description: z
    .union([z.null(), z.undefined(), z.string()])
    .transform((v) => (v ?? "").trim().slice(0, 120)),
});

export type InvoicePaymentInput = z.input<typeof invoicePaymentInput>;

/** Pagamento da fatura: tira o dinheiro da conta, mas não conta como despesa. */
export async function payCardInvoice(ctx: ServiceCtx, raw: InvoicePaymentInput) {
  const input = parseInput(invoicePaymentInput, raw);
  await requireCard(ctx, input.card_id);

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

  return (await ctx.atomic("pay_card_invoice", {
    card_id: input.card_id,
    account_id: input.account_id,
    amount: input.amount,
    date: input.date,
    title: input.description || null,
  })) as string;
}

/** Estorna o saldo e apaga a transação (função atômica do banco). */
export async function deleteTransaction(ctx: ServiceCtx, transactionId: string) {
  parseInput(id("Transação não encontrada."), transactionId);

  // Transferência Pessoal x Empresa (pró-labore, retirada, aporte): apaga os
  // dois lados juntos, para os saldos não ficarem desencontrados.
  const { data: tx } = await ctx.db
    .from("transactions")
    .select("transfer_group")
    .eq("id", transactionId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (tx?.transfer_group) {
    const { data: pair } = await ctx.db
      .from("transactions")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("transfer_group", tx.transfer_group);

    for (const row of pair ?? []) {
      await ctx.atomic("delete_transaction", { id: row.id });
    }
    return;
  }

  await ctx.atomic("delete_transaction", { id: transactionId });
}
