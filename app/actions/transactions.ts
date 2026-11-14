"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import { errorMessage, ServiceError } from "@/lib/services/context";
import {
  accountTransfer as accountTransferService,
  createCardPurchase,
  createTransaction as createTransactionService,
  deleteTransaction as deleteTransactionService,
  updateTransaction as updateTransactionService,
} from "@/lib/services/transactions";

/**
 * Resultado das ações. Em produção o Next esconde a mensagem de erros
 * lançados; por isso as ações devolvem o erro em vez de lançar.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  revalidatePath("/relatorios");
}

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    refresh();
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error("transaction action failed", error);
    return { ok: false, error: errorMessage(error, "Não foi possível salvar. Tente de novo.") };
  }
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    // Compra no cartão de crédito: vai para a fatura, não mexe no saldo da conta.
    const cardId = text(formData, "card_id");
    if (formData.get("payment_method") === "card" && cardId) {
      await createCardPurchase(await appCtx(), {
        card_id: cardId,
        category_id: text(formData, "category_id"),
        type: text(formData, "type") as "income" | "expense",
        description: text(formData, "description"),
        amount: text(formData, "amount"),
        date: text(formData, "transaction_date"),
        installments: String(formData.get("installments") || "1"),
      });
      return;
    }

    await createTransactionService(await appCtx(), {
      account_id: text(formData, "account_id"),
      category_id: text(formData, "category_id"),
      type: text(formData, "type") as "income" | "expense",
      description: text(formData, "description"),
      amount: text(formData, "amount"),
      date: text(formData, "transaction_date"),
    });
  });
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const onCard = formData.get("payment_method") === "card";
    await updateTransactionService(await appCtx(), {
      id: text(formData, "id"),
      account_id: onCard ? null : text(formData, "account_id"),
      card_id: onCard ? text(formData, "card_id") : null,
      category_id: text(formData, "category_id"),
      type: text(formData, "type") as "income" | "expense",
      description: text(formData, "description"),
      amount: text(formData, "amount"),
      date: text(formData, "transaction_date"),
    });
  });
}

export async function transferBetweenAccounts(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    await accountTransferService(await appCtx(), {
      from_account_id: text(formData, "from_account_id"),
      to_account_id: text(formData, "to_account_id"),
      amount: text(formData, "amount"),
      date: text(formData, "transaction_date"),
      description: text(formData, "description"),
    });
  });
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    await deleteTransactionService(await appCtx(), text(formData, "id"));
  });
}
