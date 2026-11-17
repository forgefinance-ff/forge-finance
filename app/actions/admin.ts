"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayInBrazil } from "@/lib/dates";

export type AdminActionResult = { ok: true; message: string } | { ok: false; error: string };

const baseSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(3, "Escreva o motivo (mínimo 3 letras).").max(300),
});

const grantSchema = baseSchema.extend({
  /** 0 = sem prazo */
  days: z.coerce.number().int().min(0).max(3650),
});

type Db = ReturnType<typeof createAdminClient>;

async function logAction(db: Db, adminEmail: string, userId: string, action: string, reason: string, detail: object) {
  const { error } = await db.from("admin_actions").insert({
    admin_email: adminEmail,
    target_user_id: userId,
    action,
    reason,
    detail,
  });
  if (error) console.error("admin_actions insert failed", error.code);
}

async function currentEntitlement(db: Db, userId: string) {
  const { data } = await db
    .from("user_entitlements")
    .select("plan_id, status, access_source, current_period_end, provider_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

function done(message: string): AdminActionResult {
  revalidatePath("/admin");
  revalidatePath("/admin/usuarios");
  return { ok: true, message };
}

function invalid(error: z.ZodError): AdminActionResult {
  return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos." };
}

/** Libera o Pro manualmente (beta, contador parceiro, cortesia), com ou sem prazo. */
export async function grantPro(input: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = grantSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { userId, reason, days } = parsed.data;

  const db = createAdminClient();
  const current = await currentEntitlement(db, userId);
  if (current?.access_source === "subscription" && ["active", "past_due"].includes(current.status)) {
    return { ok: false, error: "Esse usuário já paga a assinatura. Não precisa liberar." };
  }

  const periodEnd = days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
  const { error } = await db.from("user_entitlements").upsert(
    {
      user_id: userId,
      plan_id: "pro",
      status: "active",
      access_source: "admin",
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) return { ok: false, error: "Não foi possível liberar o Pro." };

  await logAction(db, admin.email, userId, "grant_pro", reason, { days, until: periodEnd });
  return done(days > 0 ? `Pro liberado por ${days} dias.` : "Pro liberado sem prazo.");
}

/** Estende um acesso manual que tem prazo. */
export async function extendAccess(input: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = grantSchema.extend({ days: z.coerce.number().int().min(1).max(365) }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { userId, reason, days } = parsed.data;

  const db = createAdminClient();
  const current = await currentEntitlement(db, userId);
  if (current?.access_source !== "admin") {
    return { ok: false, error: "Só dá para estender um acesso liberado manualmente." };
  }
  if (!current.current_period_end) return { ok: false, error: "Esse acesso já é sem prazo." };

  const base = Math.max(Date.now(), new Date(current.current_period_end).getTime());
  const until = new Date(base + days * 86_400_000).toISOString();
  const { error } = await db
    .from("user_entitlements")
    .update({ current_period_end: until, status: "active", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível estender." };

  await logAction(db, admin.email, userId, "extend_access", reason, { days, until });
  return done(`Acesso estendido em ${days} dias.`);
}

/** Retira um acesso que foi liberado manualmente (não mexe em assinatura paga). */
export async function revokePro(input: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { userId, reason } = parsed.data;

  const db = createAdminClient();
  const current = await currentEntitlement(db, userId);
  if (current?.access_source !== "admin") {
    return { ok: false, error: "Só dá para retirar acesso liberado manualmente. Assinatura se cancela no Stripe." };
  }

  const { error } = await db
    .from("user_entitlements")
    .update({
      plan_id: "free",
      status: "beta",
      access_source: "beta",
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível retirar o acesso." };

  await logAction(db, admin.email, userId, "revoke_pro", reason, {});
  return done("Acesso manual retirado.");
}

/** Zera as consultas de IA do mês atual. */
export async function resetAiQuota(input: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { userId, reason } = parsed.data;

  const db = createAdminClient();
  const periodStart = `${todayInBrazil().slice(0, 7)}-01`;
  const { error } = await db
    .from("usage_records")
    .update({ usage_count: 0, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("resource", "ai_assistant")
    .eq("period_start", periodStart);
  if (error) return { ok: false, error: "Não foi possível zerar a cota." };

  await logAction(db, admin.email, userId, "reset_ai_quota", reason, { period_start: periodStart });
  return done("Cota de IA do mês zerada.");
}

/** Desconecta o WhatsApp (ex.: a pessoa trocou de número). */
export async function disconnectWhatsApp(input: unknown): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { userId, reason } = parsed.data;

  const db = createAdminClient();
  const { error } = await db.from("whatsapp_links").delete().eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível desconectar." };

  await logAction(db, admin.email, userId, "disconnect_whatsapp", reason, {});
  return done("WhatsApp desconectado.");
}
