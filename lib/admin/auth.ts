import { notFound } from "next/navigation";

import { getAuthUser } from "@/lib/supabase/server";

import { isAdminEmail } from "./emails";

export { adminEmails, isAdminEmail } from "./emails";

/**
 * Garante que quem está logado é admin. Para qualquer outra pessoa a rota
 * responde 404, como se não existisse.
 */
export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const user = await getAuthUser();
  if (!user?.email || !isAdminEmail(user.email)) notFound();
  return { id: user.id, email: user.email.toLowerCase() };
}
