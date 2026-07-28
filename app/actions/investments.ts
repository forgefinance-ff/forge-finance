"use server";

import { revalidatePath } from "next/cache";
import {
  createInvestment,
  deleteInvestment,
} from "@/lib/investments";

export async function createInvestmentAction(
  formData: FormData
) {
  await createInvestment({
    name: String(formData.get("name")),
    type: String(formData.get("type")),
    invested_amount: Number(formData.get("invested_amount")),
    current_amount: Number(formData.get("current_amount")),
    institution: String(formData.get("institution")),
  });

  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
}

export async function deleteInvestmentAction(
  formData: FormData
) {
  const id = String(formData.get("id"));

  await deleteInvestment(id);

  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
}