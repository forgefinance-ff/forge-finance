// Link de primeiro acesso pelo WhatsApp.
//
// Um número desconhecido que fala com o bot recebe um link único. Ao abrir,
// a pessoa cria a conta (ou entra) e confirma: o número fica vinculado sem
// precisar de código. Como o link só chega ao próprio WhatsApp, abrir o link
// prova que a pessoa tem aquele número.
import crypto from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

const TOKEN_HOURS = 24;
const PRODUCTION_URL = "https://forge-finance-app.vercel.app";

/** Mensagem que o link de convite já deixa escrita no WhatsApp. */
export const FIRST_ACCESS_TEXT = "Quero começar no Forge Finance";

export function appUrl() {
  // Domínio de produção informado pela própria Vercel vem primeiro: assim o
  // link enviado pelo bot nunca aponta para um preview ou endereço antigo.
  const fromEnv = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || "";

  return (fromEnv || PRODUCTION_URL).replace(/\/+$/, "");
}

export function botNumber() {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "") || null;
}

/** Link para compartilhar com quem ainda não usa o app (abre a conversa com o bot). */
export function firstAccessWhatsappLink() {
  const number = botNumber();
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(FIRST_ACCESS_TEXT)}` : null;
}

export function connectUrl(token: string) {
  return `${appUrl()}/conectar-whatsapp?t=${encodeURIComponent(token)}`;
}

/** Reaproveita um link ainda válido do mesmo número; senão cria outro. */
export async function getOrCreateOnboardingToken(admin: Admin, phone: string) {
  const now = new Date().toISOString();

  const { data: existing } = await admin
    .from("whatsapp_onboarding_tokens")
    .select("token")
    .eq("phone", phone)
    .is("used_at", null)
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) return String(existing.token);

  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 60 * 60 * 1000).toISOString();

  const { error } = await admin
    .from("whatsapp_onboarding_tokens")
    .insert({ token, phone, expires_at: expiresAt });

  if (error) throw error;
  return token;
}

/** Token válido (não usado e dentro do prazo) ou null. */
export async function findOnboardingToken(admin: Admin, token: string) {
  if (!token || token.length > 64) return null;

  const { data } = await admin
    .from("whatsapp_onboarding_tokens")
    .select("token, phone")
    .eq("token", token)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data ? { token: String(data.token), phone: String(data.phone) } : null;
}

export function maskPhone(phone: string) {
  return `+${phone.slice(0, 2)} ${phone.slice(2, 4)} •••••${phone.slice(-4)}`;
}
