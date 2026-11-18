import { createAdminClient } from "@/lib/supabase/admin";

import { getVerifiedAdmin, requireAdmin } from "./auth";
import type { SupportChatMessage } from "@/lib/support-chat";

export type SupportThreadRow = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  status: "open" | "closed";
  last_sender: "user" | "admin";
  last_message_at: string;
  unread_admin: number;
  last_page: string | null;
  preview: string | null;
  plan_label: string;
};

export type AdminSupportMessage = SupportChatMessage & { admin_email: string | null };

export async function getSupportThreads(status: "open" | "closed" | "all"): Promise<SupportThreadRow[]> {
  await requireAdmin();
  const { data, error } = await createAdminClient().rpc("ff_admin_support_threads", { p_status: status });
  if (error) throw new Error(`Falha ao carregar o suporte (${error.code}).`);
  return (data ?? []) as SupportThreadRow[];
}

/** Mensagens da conversa; ao abrir, zera o "não lido" da equipe. */
export async function getThreadMessages(threadId: string): Promise<AdminSupportMessage[]> {
  await requireAdmin();
  const db = createAdminClient();
  const [{ data }] = await Promise.all([
    db
      .from("support_messages")
      .select("id, sender, body, created_at, admin_email")
      .eq("thread_id", threadId)
      .order("id", { ascending: true })
      .limit(300),
    db.from("support_threads").update({ unread_admin: 0 }).eq("id", threadId).gt("unread_admin", 0),
  ]);
  return (data ?? []) as AdminSupportMessage[];
}

/** Conversas com mensagem nova do usuário (para o número na aba). */
export async function getSupportUnreadCount(): Promise<number> {
  // Só para admin verificado; para os outros, 0 (sem 404, é usado no layout).
  if (!(await getVerifiedAdmin())) return 0;
  const { count } = await createAdminClient()
    .from("support_threads")
    .select("id", { count: "exact", head: true })
    .gt("unread_admin", 0);
  return count ?? 0;
}
