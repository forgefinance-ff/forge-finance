"use server";

import { revalidatePath } from "next/cache";

import type { MovementKind } from "@/lib/movement-kinds";
import { appCtx } from "@/lib/services/app";
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
} from "@/lib/services/registry";

export async function createCategory(formData: FormData) {
  const data = await createCategoryService(await appCtx(), {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? "") as "income" | "expense",
    color: String(formData.get("color") ?? ""),
    icon: String(formData.get("icon") ?? ""),
    kind: String(formData.get("kind") ?? "") as "" | MovementKind,
  });

  revalidatePath("/transacoes");
  revalidatePath("/categorias");
  revalidatePath("/dashboard");

  return data;
}

export async function deleteCategory(formData: FormData) {
  await deleteCategoryService(await appCtx(), String(formData.get("id")));

  revalidatePath("/transacoes");
  revalidatePath("/categorias");
  revalidatePath("/dashboard");
}
