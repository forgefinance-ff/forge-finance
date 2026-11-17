import { isManualAccessValid, isTrialActive } from "./manual-access";
import { createClient } from "@/lib/supabase/server";
import { PLAN_CATALOG, type BillingInterval, type PlanId } from "./plans";

export type UserEntitlement = {
  userId: string;
  planId: PlanId;
  status: "beta" | "active" | "past_due" | "canceled" | "suspended";
  accessSource: "beta" | "subscription" | "admin";
  aiMonthlyLimit: number;
  billingInterval: BillingInterval | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasBillingAccount: boolean;
  /** Fim do teste grátis de 30 dias (null em contas sem data). */
  trialEndsAt: string | null;
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
    // Não concede o Pro se o provisionamento falhar; segue tentando ler o registro existente.
  }

  const { data, error } = await supabase
    .from("user_entitlements")
    .select(
      "user_id, plan_id, status, access_source, billing_interval, current_period_end, cancel_at_period_end, provider_customer_id, trial_ends_at, plans(ai_monthly_limit)"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  const planId = data.plan_id as PlanId;
  if (!PLAN_CATALOG.some((plan) => plan.id === planId)) return null;
  const joinedPlan = data.plans as unknown as { ai_monthly_limit: number } | null;

  return {
    userId: data.user_id,
    planId,
    status: data.status as UserEntitlement["status"],
    accessSource: data.access_source as UserEntitlement["accessSource"],
    aiMonthlyLimit:
      planId === "free" && isTrialActive(data.trial_ends_at as string | null)
        ? (PLAN_CATALOG.find((plan) => plan.id === "pro")?.monthlyAiLimit ?? Number(joinedPlan?.ai_monthly_limit ?? 0))
        : Number(joinedPlan?.ai_monthly_limit ?? 0),
    billingInterval: (data.billing_interval as BillingInterval | null) ?? null,
    currentPeriodEnd: (data.current_period_end as string | null) ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    hasBillingAccount: Boolean(data.provider_customer_id),
    trialEndsAt: (data.trial_ends_at as string | null) ?? null,
  };
}

/** Assinante com acesso ao Forge Pro agora (inclui cobrança em nova tentativa). */
export function isProActive(entitlement: UserEntitlement | null): boolean {
  if (!entitlement) return false;
  if (entitlement.accessSource === "admin") return isManualAccessValid(entitlement.currentPeriodEnd);
  return entitlement.planId === "pro" && (entitlement.status === "active" || entitlement.status === "past_due");
}

/** Está no teste grátis do Pro (e ainda não assina). */
export function isOnTrial(entitlement: UserEntitlement | null): boolean {
  if (!entitlement || isProActive(entitlement)) return false;
  return isTrialActive(entitlement.trialEndsAt);
}
