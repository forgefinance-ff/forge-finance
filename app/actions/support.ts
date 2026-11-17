"use server";

import { createClient } from "@/lib/supabase/server";
import { SUPPORT_MAX_LENGTH, type SupportChatThread } from "@/lib/support-chat";

export type SupportSendResult = { ok: true } | { ok: false; error: string };

/** O usuário manda uma mensagem para a equipe (vai para /admin/suporte). */
export async function sendSupportMessage(body: string, page?: string): Promise<SupportSendResult> {
  const text = String(body ?? "").trim();
  if (!text) return { ok: false, error: "Escreva sua mensagem." };
  if (text.length > SUPPORT_MAX_LENGTH) return { ok: false, error: "Mensagem muito longa." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("ff_support_send", {
    p_body: text,
    p_page: typeof page === "string" ? page.slice(0, 200) : null,
  });
  if (!error) return { ok: true };
  if (error.message?.includes("rate_limited")) {
    return { ok: false, error: "Muitas mensagens seguidas. Espere alguns minutos." };
  }
  if (error.message?.includes("not_authenticated")) return { ok: false, error: "Entre na sua conta de novo." };
  return { ok: false, error: "Não foi possível enviar. Tente de novo." };
}

/** A conversa do usuário com a equipe (null se nunca escreveu). Marca as respostas como lidas. */
export async function getMySupportThread(): Promise<SupportChatThread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ff_support_my_thread");
  if (error || !data) return null;
  return data as SupportChatThread;
}
