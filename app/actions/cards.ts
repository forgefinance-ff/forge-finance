"use server";

import { revalidatePath } from "next/cache";
import { createCard, deleteCard } from "@/lib/cards";

export async function createCardAction(formData: FormData) {
  await createCard({
    name: String(formData.get("name")),
    limit_amount: Number(formData.get("limit_amount")),
    closing_day: Number(formData.get("closing_day")),
    due_day: Number(formData.get("due_day")),
    color: String(formData.get("color")),
  });

  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
}

export async function deleteCardAction(formData: FormData) {
  const id = String(formData.get("id"));

  await deleteCard(id);

  revalidatePath("/cartoes");
  revalidatePath("/dashboard");
}