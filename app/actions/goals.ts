"use server";

import { revalidatePath } from "next/cache";
import { createGoal, deleteGoal, updateGoal } from "@/lib/goals";

export async function createGoalAction(formData: FormData) {
  await createGoal({
    title: String(formData.get("title")),
    target_amount: Number(formData.get("target_amount")),
    current_amount: Number(formData.get("current_amount")),
    deadline: String(formData.get("deadline")),
  });

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function updateGoalAction(formData: FormData) {
  await updateGoal({
    id: String(formData.get("id")),
    title: String(formData.get("title")),
    target_amount: Number(formData.get("target_amount")),
    current_amount: Number(formData.get("current_amount")),
    deadline: String(formData.get("deadline")),
  });

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}

export async function deleteGoalAction(formData: FormData) {
  const id = String(formData.get("id"));

  await deleteGoal(id);

  revalidatePath("/metas");
  revalidatePath("/dashboard");
}