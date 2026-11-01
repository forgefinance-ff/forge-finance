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
