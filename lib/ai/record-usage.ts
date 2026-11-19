import { createAdminClient } from "@/lib/supabase/admin";

import { calculateUsageCost, type TokenUsage } from "./pricing";

/** Grava os tokens de uma resposta da IA. Nunca atrapalha a resposta ao usuário. */
export async function recordAiUsage(opts: {
  userId: string;
  source: "whatsapp" | "assistant";
  model: string;
  usage: TokenUsage | null | undefined;
}) {
  if (!opts.usage) return;

  try {
    const cost = calculateUsageCost(opts.model, opts.usage);
    if (!cost.priced) console.warn("AI usage: modelo sem preço na tabela", opts.model);

    const { error } = await createAdminClient().rpc("ff_usage_ai_add", {
      p_user_id: opts.userId,
      p_source: opts.source,
      p_model: opts.model,
      p_input: cost.inputTokens,
      p_output: cost.outputTokens,
      p_cache_read: cost.cacheReadTokens,
      p_cache_write: cost.cacheWriteTokens,
      p_cost_usd_micros: cost.costUsdMicros,
      p_priced: cost.priced,
    });
    if (error) console.error("AI usage record", error.code);
  } catch (error) {
    console.error("AI usage record failed", (error as Error).message);
  }
}
