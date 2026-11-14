"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, type ActionResult } from "@/lib/action-result";
import { positiveAmount } from "@/lib/services/schemas";
import { createClient, getAuthUser } from "@/lib/supabase/server";

const input = z.object({
  category_id: z.string().uuid("Escolha uma categoria."),
  monthly_limit: positiveAmount("O limite"),
});

function refresh() {
  revalidatePath("/orcamentos");
  revalidatePath("/dashboard");
}

/** Cria ou atualiza o limite mensal de uma categoria de despesa. */
export async function saveBudget(formData: FormData): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Entre de novo para continuar." };

  const parsed = input.safeParse({
    category_id: formData.get("category_id"),
    monthly_limit: String(formData.get("monthly_limit") ?? ""),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category_id: parsed.data.category_id,
      monthly_limit: parsed.data.monthly_limit,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category_id" }
  );

  if (error) return fail(error, "Não foi possível salvar o orçamento.");
  refresh();
  return { ok: true };
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Entre de novo para continuar." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Orçamento não encontrado." };

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
  if (error) return fail(error, "Não foi possível excluir o orçamento.");
  refresh();
  return { ok: true };
}
