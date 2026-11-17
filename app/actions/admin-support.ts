"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SUPPORT_MAX_LENGTH } from "@/lib/support-chat";

export type SupportAdminResult = { ok: true } | { ok: false; error: string };

const replySchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1, "Escreva a resposta.").max(SUPPORT_MAX_LENGTH, "Resposta muito longa."),
});

/** A equipe responde; a pessoa vê no balão do app. */
export async function replySupport(input: unknown): Promise<SupportAdminResult> {
  const admin = await requireAdmin();
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { threadId, body } = parsed.data;

  const db = createAdminClient();
  const { data: thread } = await db.from("support_threads").select("id, unread_user").eq("id", threadId).maybeSingle();
  if (!thread) return { ok: false, error: "Conversa não encontrada." };

  const { error } = await db.from("support_messages").insert({
    thread_id: threadId,
    sender: "admin",
    admin_email: admin.email,
    body,
  });
  if (error) return { ok: false, error: "Não foi possível enviar." };

  await db
    .from("support_threads")
    .update({
      last_sender: "admin",
      last_message_at: new Date().toISOString(),
      unread_user: (thread.unread_user ?? 0) + 1,
      unread_admin: 0,
      status: "open",
    })
    .eq("id", threadId);

  revalidatePath("/admin/suporte");
  return { ok: true };
}

/** Marca a conversa como resolvida (ou reabre). */
export async function setSupportStatus(input: unknown): Promise<SupportAdminResult> {
  await requireAdmin();
  const parsed = z.object({ threadId: z.string().uuid(), status: z.enum(["open", "closed"]) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const { error } = await createAdminClient()
    .from("support_threads")
    .update({ status: parsed.data.status, unread_admin: 0 })
    .eq("id", parsed.data.threadId);
  if (error) return { ok: false, error: "Não foi possível atualizar." };

  revalidatePath("/admin/suporte");
  return { ok: true };
}
