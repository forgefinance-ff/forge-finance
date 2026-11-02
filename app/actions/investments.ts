"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import { createInvestment, deleteInvestment } from "@/lib/services/registry";

export async function createInvestmentAction(formData: FormData) {
  await createInvestment(await appCtx(), {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    invested_amount: String(formData.get("invested_amount") ?? ""),
    current_value: String(formData.get("current_amount") ?? ""),
    institution: String(formData.get("institution") ?? ""),
  });

  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
}

export async function deleteInvestmentAction(formData: FormData) {
  await deleteInvestment(await appCtx(), String(formData.get("id")));

  revalidatePath("/investimentos");
  revalidatePath("/dashboard");
}
