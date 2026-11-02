"use server";

import { revalidatePath } from "next/cache";

import { appCtx } from "@/lib/services/app";
import {
  createAccount as createAccountService,
  deleteAccount as deleteAccountService,
} from "@/lib/services/registry";

export async function createAccount(formData: FormData) {
  await createAccountService(await appCtx(), {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    color: String(formData.get("color") ?? ""),
    initial_balance: String(formData.get("initial_balance") ?? ""),
  });

  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function deleteAccount(formData: FormData) {
  await deleteAccountService(await appCtx(), String(formData.get("id")));

  revalidatePath("/contas");
  revalidatePath("/dashboard");
}
