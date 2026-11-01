"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
