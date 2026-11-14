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

  // Transferência (entre contas ou Pessoal x Empresa): apaga os dois lados
  // numa única operação do banco, para os saldos nunca ficarem desencontrados.
  const { data: tx } = await ctx.db
    .from("transactions")
    .select("transfer_group")
    .eq("id", transactionId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (tx?.transfer_group) {
    await ctx.atomic("delete_transfer_group", { group: tx.transfer_group });
    return;
  }

  await ctx.atomic("delete_transaction", { id: transactionId });
}

export const updateTransactionInput = z
  .object({
    id: id("Transação não encontrada."),
    account_id: optionalId,
    card_id: optionalId,
    category_id: optionalId,
    type: z.enum(["income", "expense"], { message: "Escolha se é entrada ou saída." }),
    description: z
      .union([z.null(), z.undefined(), z.string()])
      .transform((v) => (v ?? "").trim())
      .refine((v) => v.length <= 120, "A descrição pode ter no máximo 120 caracteres."),
    amount: positiveAmount(),
    date: dateString(),
  })
  .refine((v) => !!v.account_id !== !!v.card_id, "Escolha uma conta ou um cartão.");

export type UpdateTransactionInput = z.input<typeof updateTransactionInput>;

/** Edita valor, data, descrição, categoria e conta/cartão, ajustando os saldos. */
export async function updateTransaction(ctx: ServiceCtx, raw: UpdateTransactionInput) {
  const input = parseInput(updateTransactionInput, raw);

  if (input.account_id) {
    const { data: account } = await ctx.db
      .from("accounts")
      .select("scope")
      .eq("id", input.account_id)
      .eq("user_id", ctx.userId)
      .maybeSingle();
    if (!account) throw new ServiceError("Conta não encontrada.");
    if (account.scope !== ctx.scope) throw new ServiceError("Esta conta não pertence ao escopo ativo.");
  }
  if (input.card_id) await requireCard(ctx, input.card_id);

  await ctx.atomic("update_transaction", {
    id: input.id,
    account_id: input.account_id,
    card_id: input.card_id,
    category_id: input.category_id,
    type: input.type,
    title: input.description,
    amount: input.amount,
    date: input.date,
  });
}

export const accountTransferInput = z
  .object({
    from_account_id: id("Escolha a conta de origem."),
    to_account_id: id("Escolha a conta de destino."),
    amount: positiveAmount(),
    date: dateString(),
    description: z
      .union([z.null(), z.undefined(), z.string()])
      .transform((v) => (v ?? "").trim().slice(0, 120)),
  })
  .refine((v) => v.from_account_id !== v.to_account_id, "Escolha duas contas diferentes.");

export type AccountTransferInput = z.input<typeof accountTransferInput>;

/** Move dinheiro entre contas próprias do mesmo escopo. Não é receita nem despesa. */
export async function accountTransfer(ctx: ServiceCtx, raw: AccountTransferInput) {
  const input = parseInput(accountTransferInput, raw);

  const { data: accounts } = await ctx.db
    .from("accounts")
    .select("id, scope")
    .eq("user_id", ctx.userId)
    .in("id", [input.from_account_id, input.to_account_id]);

  if ((accounts ?? []).length !== 2) throw new ServiceError("Conta não encontrada.");
  if ((accounts ?? []).some((a) => a.scope !== ctx.scope)) {
    throw new ServiceError("As duas contas precisam ser do escopo ativo.");
  }

  return (await ctx.atomic("account_transfer", {
    from_account_id: input.from_account_id,
    to_account_id: input.to_account_id,
    amount: input.amount,
    date: input.date,
    description: input.description || null,
  })) as string;
}
