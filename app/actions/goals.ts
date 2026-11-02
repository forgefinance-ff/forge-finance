"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import { createGoal, deleteGoal, updateGoal } from "@/lib/services/registry";

function readGoal(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    target_amount: String(formData.get("target_amount") ?? ""),
    current_amount: String(formData.get("current_amount") ?? ""),
    deadline: String(formData.get("deadline") ?? ""),
  };
}

export async function createGoalAction(formData: FormData) {
  await createGoal(await appCtx(), readGoal(formData));

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function updateGoalAction(formData: FormData) {
  await updateGoal(await appCtx(), String(formData.get("id")), readGoal(formData));

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function deleteGoalAction(formData: FormData) {
  await deleteGoal(await appCtx(), String(formData.get("id")));

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}
