"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { runAction } from "@/lib/services/app";
import * as business from "@/lib/services/business";

function refresh(result: ActionResult, alsoBalances = false) {
  if (!result.ok) return result;
  revalidatePath("/impostos");
  revalidatePath("/dashboard");
  if (alsoBalances) {
    revalidatePath("/transacoes");
    revalidatePath("/contas");
    revalidatePath("/relatorios");
  }
  return result;
}

export async function saveMeiSettings(formData: FormData): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) =>
        business.saveMeiSettings(ctx, {
          activity: String(formData.get("activity") ?? "") as "servicos",
          das_due_day: String(formData.get("das_due_day") ?? ""),
          annual_limit: String(formData.get("annual_limit") ?? ""),
          das_amount: String(formData.get("das_amount") ?? ""),
          opening_date: String(formData.get("opening_date") ?? ""),
          dasn_due_date: String(formData.get("dasn_due_date") ?? ""),
        }),
      "Não foi possível salvar as configurações."
    )
  );
}

export async function generateDas(formData: FormData): Promise<ActionResult> {
  return refresh(
    await runAction(
      (ctx) =>
        business.generateDas(ctx, {
          competence: String(formData.get("competence") ?? ""),
          amount: String(formData.get("amount") ?? ""),
          due_date: String(formData.get("due_date") ?? ""),
        }),
      "Não foi possível gerar o DAS."
    )
  );
}

/** Cria a despesa em "Impostos" (empresa) e ajusta o saldo, tudo no banco. */
export async function payDas(id: string, accountId: string, paidAt: string): Promise<ActionResult> {
  if (!accountId) return { ok: false, error: "Escolha a conta da empresa." };

  return refresh(
    await runAction(
      (ctx) => business.payDas(ctx, id, accountId, paidAt),
      "Não foi possível registrar o pagamento do DAS."
    ),
    true
  );
}

/** Remove uma guia gerada por engano (só pendentes). */
export async function deleteDas(id: string): Promise<ActionResult> {
  return refresh(
    await runAction((ctx) => business.deleteDas(ctx, id), "Não foi possível remover o DAS.")
  );
}
