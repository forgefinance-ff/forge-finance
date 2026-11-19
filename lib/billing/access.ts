import type { SupabaseClient } from "@supabase/supabase-js";

import { billingEnabled } from "./config";
import { grantsBusiness, grantsWhatsApp, type AccessRow } from "./manual-access";

export { isManualAccessValid, isTrialActive, trialDaysLeft } from "./manual-access";

async function readAccess(db: SupabaseClient, userId: string): Promise<AccessRow | null> {
  const { data, error } = await db
    .from("user_entitlements")
    .select("plan_id, status, access_source, current_period_end, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AccessRow;
}

/** WhatsApp é dos planos pagos. Com a cobrança desligada, todo mundo usa. */
export async function hasWhatsAppAccess(admin: SupabaseClient, userId: string): Promise<boolean> {
  if (!billingEnabled()) return true;
  const row = await readAccess(admin, userId);
  return row ? grantsWhatsApp(row) : false;
}

/** Modo Empresa é do Forge MEI. Com a cobrança desligada, todo mundo usa. */
export async function hasBusinessAccess(db: SupabaseClient, userId: string): Promise<boolean> {
  if (!billingEnabled()) return true;
  const row = await readAccess(db, userId);
  return row ? grantsBusiness(row) : false;
}
