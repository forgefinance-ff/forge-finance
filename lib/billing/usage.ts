import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AiQuota = {
  allowed: boolean;
  used: number;
  monthlyLimit: number;
  remaining: number;
  periodStart: string;
};

export async function consumeAiQuota(): Promise<AiQuota | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_my_ai_quota");
  if (error || !data || !Array.isArray(data) || !data[0]) return null;
  const row = data[0] as {
    allowed: boolean;
    used: number;
    monthly_limit: number;
    remaining: number;
    period_start: string;
  };
  return {
    allowed: Boolean(row.allowed),
    used: Number(row.used),
    monthlyLimit: Number(row.monthly_limit),
    remaining: Number(row.remaining),
    periodStart: row.period_start,
  };
}

/**
 * Devolve a consulta quando o provedor de IA falha (a pessoa não paga pelo erro).
 * Só o servidor devolve (service role); o usuário não consegue chamar direto.
 */
export async function refundAiQuota(userId: string): Promise<void> {
  const { error } = await createAdminClient().rpc("ff_refund_ai_quota", { p_user_id: userId });
  if (error) console.error("AI quota refund failed", error.code);
}
