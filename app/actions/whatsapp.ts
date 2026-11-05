"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WHATSAPP_HELP } from "@/lib/whatsapp/handler";
import { findOnboardingToken } from "@/lib/whatsapp/onboarding";
import { metaTransport } from "@/lib/whatsapp/transport";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

/** Conecta à conta logada o número que recebeu o link de primeiro acesso. */
export async function claimWhatsappOnboarding(token: string): Promise<ClaimResult> {
  const user = await requireUser();
  const admin = createAdminClient();

  const found = await findOnboardingToken(admin, token);
  if (!found) {
    return {
      ok: false,
      message: "Este link expirou ou já foi usado. Mande qualquer mensagem para o Forge Finance no WhatsApp e receba um novo.",
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

  await admin.from("whatsapp_links").delete().eq("user_id", user.id);
  await admin.from("whatsapp_pending").delete().eq("user_id", user.id);

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
