import { createClient } from "@/lib/supabase/server";

/**
 * Limite de requisições guardado no banco (vale para todas as instâncias
 * do servidor). true = pode seguir.
 *
 * Se o banco não responder, deixa passar: um limite que derruba o app
 * quando o banco oscila é pior que nenhum.
 */
export async function allowRequest(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ff_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit unavailable", error.code);
    return true;
  }
  return data !== false;
}
