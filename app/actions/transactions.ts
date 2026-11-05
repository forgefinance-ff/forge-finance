"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import {
  createCardPurchase,
  createTransaction as createTransactionService,
  deleteTransaction as deleteTransactionService,
} from "@/lib/services/transactions";

function refresh() {
  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function createTransaction(formData: FormData) {
  // Compra no cartão de crédito: vai para a fatura, não mexe no saldo da conta.
  const cardId = String(formData.get("card_id") ?? "");
  if (formData.get("payment_method") === "card" && cardId) {
    await createCardPurchase(await appCtx(), {
      card_id: cardId,
      category_id: String(formData.get("category_id") ?? ""),
      type: String(formData.get("type") ?? "") as "income" | "expense",
      description: String(formData.get("description") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      date: String(formData.get("transaction_date") ?? ""),
      installments: String(formData.get("installments") || "1"),
    });
    refresh();
    return;
  }

  await createTransactionService(await appCtx(), {
    account_id: String(formData.get("account_id") ?? ""),
    category_id: String(formData.get("category_id") ?? ""),
    type: String(formData.get("type") ?? "") as "income" | "expense",
    description: String(formData.get("description") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    date: String(formData.get("transaction_date") ?? ""),
  });

  refresh();
}

export async function deleteTransaction(formData: FormData) {
  await deleteTransactionService(await appCtx(), String(formData.get("id")));

  refresh();
}
