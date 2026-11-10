"use server";

import { revalidatePath } from "next/cache";

import { fail, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

const GROUPS = ["essential", "lifestyle"] as const;

/** Essencial x estilo de vida de uma categoria de despesa do Pessoal (Raio-X). */
export async function setCategorySpendingGroup(
  categoryId: string,
  group: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

    const value = (GROUPS as readonly string[]).includes(group) ? group : null;

    const { error } = await supabase.rpc("ff_set_category_spending_group", {
      p_id: categoryId,
      p_group: value,
    });

    if (error) return fail(error, "Não foi possível salvar o grupo.");
    revalidatePath("/categorias");
    revalidatePath("/raio-x");
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar o grupo.");
  }
}
