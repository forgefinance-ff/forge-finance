"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import { createCard, deleteCard } from "@/lib/services/registry";

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
