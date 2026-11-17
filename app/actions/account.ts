"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { billingEnabled } from "@/lib/billing/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getAuthUser } from "@/lib/supabase/server";

/**
 * Exclui a conta e TODOS os dados (as tabelas apagam em cascata com o
 * usuário). Pede para digitar EXCLUIR. Com assinatura ativa, pede para
 * cancelar antes, para não seguir cobrando.
 */
export async function deleteMyAccount(formData: FormData): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Entre de novo para continuar." };

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "EXCLUIR") {
    return { ok: false, error: "Digite EXCLUIR para confirmar." };
  }

  const supabase = await createClient();

  if (billingEnabled()) {
    const { data } = await supabase
      .from("user_entitlements")
      .select("status, access_source, provider_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.provider_subscription_id && (data.status === "active" || data.status === "past_due")) {
      return {
        ok: false,
        error: "Você tem uma assinatura ativa. Cancele em Assinatura antes de excluir a conta.",
      };
    }
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (error) {
    console.error("account delete failed", error);
    return { ok: false, error: "Não foi possível excluir agora. Tente de novo ou fale com o suporte." };
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}

const prefsInput = z.object({
  weekly_summary: z.boolean(),
  monthly_summary: z.boolean(),
  budget_alerts: z.boolean(),
});

/** Avisos: resumo semanal e alertas de orçamento (no WhatsApp). */
export async function saveNotificationPrefs(prefs: { weekly_summary: boolean; monthly_summary: boolean; budget_alerts: boolean }): Promise<ActionResult> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Entre de novo para continuar." };

  const parsed = prefsInput.safeParse(prefs);
  if (!parsed.success) return { ok: false, error: "Preferência inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) return { ok: false, error: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/configuracoes");
  return { ok: true };
}
