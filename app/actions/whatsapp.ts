"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAuthUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHATSAPP_HELP } from "@/lib/whatsapp/handler";
import { findOnboardingToken } from "@/lib/whatsapp/onboarding";
import { metaTransport } from "@/lib/whatsapp/transport";
import { allowRequest } from "@/lib/rate-limit";

async function requireUser() {
  const user = await getAuthUser();

  if (!user) throw new Error("Usuário não autenticado.");

  return user;
}

export async function generateWhatsappCode() {
  const user = await requireUser();
  const admin = createAdminClient();

  await admin.from("whatsapp_link_codes").delete().eq("user_id", user.id);

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(crypto.randomInt(100000, 1000000));

    const { error } = await admin
      .from("whatsapp_link_codes")
      .insert({ code, user_id: user.id, expires_at: expiresAt });

    if (!error) break;
    if (error.code !== "23505") throw error;
  }

  revalidatePath("/whatsapp");
}

export type ClaimResult = { ok: true } | { ok: false; message: string };

/**
 * Conecta à conta logada o número que recebeu o link de primeiro acesso.
 *
 * O link pode ser repassado: quem o recebe não prova que é dono do número.
 * Por isso a pessoa precisa digitar os 4 últimos dígitos do SEU WhatsApp
 * (a página não mostra esses dígitos) e, se a conta já tiver outro número,
 * precisa desconectá-lo antes. Assim um golpista não consegue ligar o próprio
 * celular à conta de outra pessoa mandando o link dele.
 */
export async function claimWhatsappOnboarding(token: string, lastDigits: string): Promise<ClaimResult> {
  const user = await requireUser();
  const admin = createAdminClient();

  if (!(await allowRequest(user.id, "wa_claim", 5, 3600))) {
    return { ok: false, message: "Muitas tentativas. Espere um pouco e tente de novo." };
  }

  const found = await findOnboardingToken(admin, token);
  if (!found) {
    return {
      ok: false,
      message: "Este link expirou ou já foi usado. Mande qualquer mensagem para o Forge Finance no WhatsApp e receba um novo.",
    };
  }

  const digits = String(lastDigits ?? "").replace(/\D/g, "");
  if (digits.length !== 4 || !found.phone.endsWith(digits)) {
    return {
      ok: false,
      message: "Os 4 últimos números não batem com o WhatsApp deste link. Abra o link que chegou no SEU WhatsApp.",
    };
  }

  const { data: phoneOwner } = await admin
    .from("whatsapp_links")
    .select("user_id")
    .eq("phone", found.phone)
    .maybeSingle();

  if (phoneOwner && phoneOwner.user_id !== user.id) {
    return { ok: false, message: "Este número já está conectado a outra conta do Forge Finance." };
  }

  const { data: current } = await admin
    .from("whatsapp_links")
    .select("phone")
    .eq("user_id", user.id)
    .maybeSingle();

  if (current?.phone && current.phone !== found.phone) {
    return {
      ok: false,
      message: "Sua conta já tem outro WhatsApp conectado. Desconecte-o na página WhatsApp do app antes de conectar este.",
    };
  }

  const { error } = await admin.from("whatsapp_links").upsert(
    { user_id: user.id, phone: found.phone, verified_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("WhatsApp onboarding link error", error.code);
    return { ok: false, message: "Não consegui conectar agora. Tente de novo em instantes." };
  }

  await admin
    .from("whatsapp_onboarding_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("phone", found.phone)
    .is("used_at", null);
  await admin.from("whatsapp_link_codes").delete().eq("user_id", user.id);
  // Conversa antiga deste número não vale para esta conta.
  await admin.from("whatsapp_conversation").delete().eq("phone", found.phone);

  // A pessoa acabou de falar com o bot, então a janela de 24h está aberta.
  await metaTransport
    .text(found.phone, `✅ Pronto! Este número está conectado à sua conta.\n\n${WHATSAPP_HELP}`)
    .catch(() => undefined);

  revalidatePath("/whatsapp");
  return { ok: true };
}

export async function unlinkWhatsapp() {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: link } = await admin.from("whatsapp_links").select("phone").eq("user_id", user.id).maybeSingle();

  await admin.from("whatsapp_links").delete().eq("user_id", user.id);
  await admin.from("whatsapp_pending").delete().eq("user_id", user.id);
  await admin.from("whatsapp_undo").delete().eq("user_id", user.id);
  // A memória da conversa é por telefone: sem limpar, uma conta conectada
  // depois a este número herdaria as mensagens desta.
  if (link?.phone) await admin.from("whatsapp_conversation").delete().eq("phone", link.phone);

  revalidatePath("/whatsapp");
}

export async function setWhatsappDefaultAccount(formData: FormData) {
  const user = await requireUser();
  const admin = createAdminClient();

  const accountId = String(formData.get("account_id") ?? "");

  if (accountId) {
    // Garante que a conta pertence ao usuário antes de gravar.
    const { data: account } = await admin
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!account) throw new Error("Conta inválida.");
  }

  await admin
    .from("whatsapp_links")
    .update({ default_account_id: accountId || null })
    .eq("user_id", user.id);

  revalidatePath("/whatsapp");
}
