"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import {
  createTransaction as createTransactionService,
  deleteTransaction as deleteTransactionService,
} from "@/lib/services/transactions";

function refresh() {
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function createTransaction(formData: FormData) {
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
