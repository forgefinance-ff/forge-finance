// Guia de primeiros passos: o que a pessoa já fez e o que falta.
import crypto from "node:crypto";

import { hasWhatsAppAccess } from "@/lib/billing/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const GUIDE_SKIP_COOKIE = "ff_guide_skip";

export type GuideProgress = {
  /** "pro": WhatsApp liberado (assinante ou beta). "free": sem WhatsApp. */
  mode: "pro" | "free";
  whatsapp: boolean;
  hasAccount: boolean;
  firstEntry: boolean;
  defaultAccount: boolean;
  /** Primeiro passo do modo atual (o que abre o guia sozinho enquanto falta). */
  firstStepDone: boolean;
  next: string;
  done: number;
  total: number;
  complete: boolean;
};

export async function getGuideProgress(userId: string): Promise<GuideProgress> {
  const supabase = await createClient();

  const [{ data: link }, { count: entries }, { count: accounts }, whatsappAllowed] = await Promise.all([
    supabase.from("whatsapp_links").select("default_account_id").eq("user_id", userId).maybeSingle(),
    supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("accounts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    hasWhatsAppAccess(createAdminClient(), userId),
  ]);

  const whatsapp = Boolean(link);
  const hasAccount = (accounts ?? 0) > 0;
  const firstEntry = (entries ?? 0) > 0;
  const defaultAccount = Boolean(link?.default_account_id);

  if (whatsappAllowed) {
    const steps = [whatsapp, firstEntry, defaultAccount];
    const done = steps.filter(Boolean).length;
    return {
      mode: "pro",
      whatsapp,
      hasAccount,
      firstEntry,
      defaultAccount,
      firstStepDone: whatsapp,
      next: !whatsapp
        ? "Conecte seu WhatsApp"
        : !firstEntry
          ? "Registre seu primeiro gasto pelo WhatsApp"
          : "Escolha sua conta principal",
      done,
      total: 3,
      complete: done === 3,
    };
  }

  // Plano grátis (com a cobrança ligada): tudo pelo app, WhatsApp vira convite.
  const steps = [hasAccount, firstEntry];
  const done = steps.filter(Boolean).length;
  return {
    mode: "free",
    whatsapp,
    hasAccount,
    firstEntry,
    defaultAccount,
    firstStepDone: hasAccount,
    next: !hasAccount ? "Cadastre sua conta principal" : "Registre seu primeiro lançamento",
    done,
    total: 2,
    complete: done === 2,
  };
}

/** Código VINCULAR válido por pelo menos mais 3 minutos (cria um se precisar). */
export async function ensureLinkCode(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const minValid = new Date(Date.now() + 3 * 60 * 1000).toISOString();

  const { data: current } = await admin
    .from("whatsapp_link_codes")
    .select("code")
    .eq("user_id", userId)
    .gt("expires_at", minValid)
    .maybeSingle();

  if (current?.code) return current.code;

  await admin.from("whatsapp_link_codes").delete().eq("user_id", userId);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(crypto.randomInt(100000, 1000000));
    const { error } = await admin
      .from("whatsapp_link_codes")
      .insert({ code, user_id: userId, expires_at: expiresAt });

    if (!error) return code;
    if (error.code !== "23505") break;
  }

  return null;
}

/** 5521993885476 → +55 21 99388-5476 */
export function formatBotNumber(digits: string) {
  const m = digits.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]}-${m[4]}` : `+${digits}`;
}
