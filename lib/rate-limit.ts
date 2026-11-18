import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Limite de requisições guardado no banco (vale para todas as instâncias
 * do servidor). true = pode seguir.
 *
 * Só o servidor mexe no contador (service role): o usuário não consegue
 * zerar o próprio limite chamando a função direto.
 *
 * `subject` é o id do usuário, um telefone ou "global".
 *
 * Se o banco não responder, deixa passar: um limite que derruba o app
 * quando o banco oscila é pior que nenhum.
 */
export async function allowRequest(
  subject: string,
  bucket: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("ff_rate_limit_for", {
    p_subject: subject,
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
