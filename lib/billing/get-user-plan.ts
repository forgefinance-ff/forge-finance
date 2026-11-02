import { createClient } from "@/lib/supabase/server";
import { PLAN_CATALOG, type PlanId } from "./plans";

export type UserEntitlement = {
  userId: string;
  planId: PlanId;
  status: "beta" | "active" | "past_due" | "canceled" | "suspended";
  accessSource: "beta" | "subscription" | "admin";
  aiMonthlyLimit: number;
};

/** Busca permissões no banco. Falhas não elevam privilégios: usa apenas o acesso beta de forma explícita. */
export async function getUserEntitlement(userId?: string): Promise<UserEntitlement | null> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user || (userId && user.id !== userId)) return null;

  // Repara, de forma idempotente, contas criadas antes da migration ou com provisionamento ausente.
  const { error: ensureError } = await supabase.rpc("ensure_my_beta_entitlement");
  if (ensureError) {
    // Não concede Plus/Business se o provisionamento falhar; segue tentando ler o registro existente.
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select("user_id, plan_id, status, access_source, plans(ai_monthly_limit)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  const planId = (data.plan_id as PlanId);
  if (!PLAN_CATALOG.some((plan) => plan.id === planId)) return null;
  const joinedPlan = data.plans as unknown as { ai_monthly_limit: number } | null;

  return {
    userId: data.user_id,
    planId,
    status: data.status as UserEntitlement["status"],
    accessSource: data.access_source as UserEntitlement["accessSource"],
    aiMonthlyLimit: Number(joinedPlan?.ai_monthly_limit ?? 0),
  };
}
