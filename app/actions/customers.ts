"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/lib/services/app";
import * as business from "@/lib/services/business";

function readCustomer(formData: FormData): business.CustomerInput {
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function refresh(result: ActionResult) {
  if (result.ok) revalidatePath("/clientes");
  return result;
}

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) => business.createCustomer(ctx, readCustomer(formData)),
      "Não foi possível cadastrar o cliente."
    )
  );
}

export async function updateCustomer(formData: FormData): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) =>
        business.updateCustomer(ctx, String(formData.get("id") ?? ""), readCustomer(formData)),
      "Não foi possível salvar o cliente."
    )
  );
}

export async function setCustomerArchived(id: string, archived: boolean): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) => business.setCustomerArchived(ctx, id, archived),
      "Não foi possível atualizar o cliente."
    )
  );
}

/** Cliente com cobranças não pode ser excluído (só arquivado). */
export async function deleteCustomer(id: string): Promise<ActionResult> {
  return refresh(
    await runAction((ctx) => business.deleteCustomer(ctx, id), "Não foi possível excluir o cliente.")
  );
}
