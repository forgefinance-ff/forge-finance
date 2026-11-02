"use server";

import crypto from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { handleIncoming } from "@/lib/whatsapp/handler";
import { memoryTransport, type SimulatedMessage } from "@/lib/whatsapp/transport";

export type SimulateResult =
  | { ok: true; messages: SimulatedMessage[] }
  | { ok: false; error: string };

/**
 * Simulador do bot (só em desenvolvimento): roda o MESMO fluxo do webhook com
 * o número vinculado do usuário logado, mas as respostas voltam para a tela
 * em vez de irem para a API da Meta.
 */
export async function simulateWhatsapp(input: {
  text?: string;
  buttonId?: string;
}): Promise<SimulateResult> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "O simulador só funciona em desenvolvimento." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Entre no app para usar o simulador." };

  const { data: link } = await createAdminClient()
    .from("whatsapp_links")
    .select("phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!link) return { ok: false, error: "Vincule seu WhatsApp na página WhatsApp primeiro." };

  const text = input.text?.trim().slice(0, 1000);
  if (!text && !input.buttonId) return { ok: false, error: "Digite uma mensagem." };

  const messages: SimulatedMessage[] = [];

  await handleIncoming(
    {
      id: `sim-${crypto.randomUUID()}`,
      from: link.phone,
      type: input.buttonId ? "button" : "text",
      text,
      buttonId: input.buttonId,
    },
    memoryTransport(messages)
  );

  return { ok: true, messages };
}
