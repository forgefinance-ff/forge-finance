import type { SupabaseClient } from "@supabase/supabase-js";

import { billingEnabled } from "./config";
import { isManualAccessValid } from "./manual-access";

export { isManualAccessValid } from "./manual-access";

/**
 * O registro pelo WhatsApp é do Forge Pro. Com a cobrança desligada (beta),
 * todo mundo usa. Acesso "admin" (concedido manualmente) também libera.
 */
export async function hasWhatsAppAccess(admin: SupabaseClient, userId: string): Promise<boolean> {
  if (!billingEnabled()) return true;

  const { data, error } = await admin
    .from("user_entitlements")
    .select("plan_id, status, access_source, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return false;
  if (data.access_source === "admin") return isManualAccessValid(data.current_period_end);

  return data.plan_id === "pro" && (data.status === "active" || data.status === "past_due");
}

/**
 * Pessoal + Empresa (MEI) é do Forge Pro, como diz a página de planos.
 * Com a cobrança desligada, todos usam.
 */
export async function hasBusinessAccess(db: SupabaseClient, userId: string): Promise<boolean> {
  return hasWhatsAppAccess(db, userId);
}

