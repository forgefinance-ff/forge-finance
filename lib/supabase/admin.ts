import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role: IGNORA o RLS. Use somente no servidor
 * (webhook do WhatsApp) e sempre filtrando por user_id manualmente.
 * Nunca importe em componentes client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
