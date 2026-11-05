"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import { createCard, deleteCard } from "@/lib/services/registry";
import { errorMessage } from "@/lib/services/context";
import { payCardInvoice } from "@/lib/services/transactions";

export async function createCardAction(formData: FormData) {
  await createCard(await appCtx(), {
    name: String(formData.get("name") ?? ""),
    limit_amount: String(formData.get("limit_amount") ?? ""),
    closing_day: String(formData.get("closing_day") ?? ""),
    due_day: String(formData.get("due_day") ?? ""),
    color: String(formData.get("color") ?? ""),
  });

  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
}

export async function deleteCardAction(formData: FormData) {
  await deleteCard(await appCtx(), String(formData.get("id")));

  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
}

export type PayInvoiceResult = { ok: true } | { ok: false; error: string };

/** Paga (total ou parcial) a fatura: sai da conta, não conta como despesa. */
export async function payCardInvoiceAction(formData: FormData): Promise<PayInvoiceResult> {
  try {
    await payCardInvoice(await appCtx(), {
      card_id: String(formData.get("card_id") ?? ""),
      account_id: String(formData.get("account_id") ?? ""),
      amount: String(formData.get("amount") ?? ""),
      date: String(formData.get("date") ?? ""),
      description: String(formData.get("description") ?? ""),
    });
  } catch (error) {
    return { ok: false, error: errorMessage(error, "Não foi possível registrar o pagamento.") };
  }

  revalidatePath("/cartoes");
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
  return { ok: true };
}
