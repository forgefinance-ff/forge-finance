"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/lib/services/app";
import * as business from "@/lib/services/business";

function readPayable(formData: FormData): business.PayableInput {
  return {
    kind: String(formData.get("kind") ?? "") as "payable" | "receivable",
    description: String(formData.get("description") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    due_date: String(formData.get("due_date") ?? ""),
    account_id: String(formData.get("account_id") ?? ""),
    category_id: String(formData.get("category_id") ?? ""),
    customer_id: String(formData.get("customer_id") ?? ""),
    recurrence: String(formData.get("recurrence") ?? "none") as "none" | "monthly",
    notes: String(formData.get("notes") ?? ""),
  };
}

function refresh(result: ActionResult, alsoBalances = false) {
  if (!result.ok) return result;
  revalidatePath("/contas-a-pagar-receber");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  if (alsoBalances) {
    revalidatePath("/transacoes");
    revalidatePath("/contas");
    revalidatePath("/relatorios");
  }
  return result;
}

export async function createPayable(formData: FormData): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) => business.createPayable(ctx, readPayable(formData)),
      "Não foi possível salvar a conta."
    )
  );
}

export async function updatePayable(formData: FormData): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) => business.updatePayable(ctx, String(formData.get("id") ?? ""), readPayable(formData)),
      "Não foi possível salvar a conta."
    )
  );
}

/**
 * Marca como paga/recebida: cria a transação (mesma regra do app), ajusta o
 * saldo e gera a próxima se for mensal. Tudo numa operação no banco.
 */
export async function settlePayable(
  id: string,
  accountId: string,
  paidAt: string
): Promise<ActionResult> {
  if (!accountId) return { ok: false, error: "Escolha a conta." };

  return refresh(
    await runAction(
      (ctx) => business.settlePayable(ctx, id, accountId, paidAt),
      "Não foi possível registrar o pagamento."
    ),
    true
  );
}

export async function cancelPayable(id: string): Promise<ActionResult> {
  return refresh(
    await runAction((ctx) => business.cancelPayable(ctx, id), "Não foi possível cancelar a conta.")
  );
}

/** Contas pagas ficam como histórico da transação criada. */
export async function deletePayable(id: string): Promise<ActionResult> {
  return refresh(
    await runAction((ctx) => business.deletePayable(ctx, id), "Não foi possível excluir a conta.")
  );
}
