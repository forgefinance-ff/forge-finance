import type { SupabaseClient } from "@supabase/supabase-js";

import { billingEnabled } from "./config";

/**
 * O registro pelo WhatsApp é do Forge Pro. Com a cobrança desligada (beta),
 * todo mundo usa. Acesso "admin" (concedido manualmente) também libera.
 */
export async function hasWhatsAppAccess(admin: SupabaseClient, userId: string): Promise<boolean> {
  if (!billingEnabled()) return true;

  const { data, error } = await admin
    .from("user_entitlements")
    .select("plan_id, status, access_source")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.access_source === "admin") return true;

  return data.plan_id === "pro" && (data.status === "active" || data.status === "past_due");
}
