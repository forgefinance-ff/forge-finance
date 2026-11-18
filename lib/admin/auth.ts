import { cache } from "react";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { isAdminEmail } from "./emails";

export { adminEmails, isAdminEmail } from "./emails";

type Admin = { id: string; email: string };

/**
 * Admin verificado no servidor de Auth (não só no token): a sessão precisa
 * estar ativa, o e-mail precisa estar CONFIRMADO e estar em ADMIN_EMAILS.
 * Sem a confirmação, quem cadastrasse primeiro um e-mail de admin ainda sem
 * conta viraria admin. Vale para a requisição inteira (React cache).
 */
export const getVerifiedAdmin = cache(async (): Promise<Admin | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (error || !user?.email || !user.email_confirmed_at) return null;
  if (!isAdminEmail(user.email)) return null;
  return { id: user.id, email: user.email.toLowerCase() };
});

/**
 * Garante que quem está logado é admin. Para qualquer outra pessoa a rota
 * responde 404, como se não existisse.
 *
 * Chame em TODA página, ação e função que lê dados de admin, não só no layout:
 * o layout sozinho não garante que a página não seja renderizada.
 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getVerifiedAdmin();
  if (!admin) notFound();
  return admin;
}
