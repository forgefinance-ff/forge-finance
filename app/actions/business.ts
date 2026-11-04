"use server";

import { revalidatePath } from "next/cache";

import { fail, type ActionResult } from "@/lib/action-result";
import { isRealDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

async function userClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function refreshAll() {
  revalidatePath("/gestao");
  revalidatePath("/dashboard");
  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/relatorios");
  revalidatePath("/categorias");
}

/** Meta de faturamento mensal e margem de lucro desejada (%). */
export async function saveBusinessGoals(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await userClient();
    if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

    const revenueRaw = String(formData.get("monthly_revenue_goal") ?? "").trim();
    const marginRaw = String(formData.get("target_margin_pct") ?? "").trim();

    const revenue = revenueRaw ? parseAmount(revenueRaw) : null;
    const margin = marginRaw ? parseAmount(marginRaw) : null;

    if (revenue !== null && !(Number.isFinite(revenue) && revenue > 0)) {
      return { ok: false, error: "A meta de faturamento deve ser maior que zero." };
    }
    if (margin !== null && !(Number.isFinite(margin) && margin > 0 && margin < 100)) {
      return { ok: false, error: "A margem deve ficar entre 0% e 100%." };
    }

    const { error } = await supabase.from("mei_settings").upsert(
      {
        user_id: user.id,
        monthly_revenue_goal: revenue === null ? null : Math.round(revenue * 100) / 100,
        target_margin_pct: margin === null ? null : Math.round(margin * 100) / 100,
      },
      { onConflict: "user_id" }
    );

    if (error) return fail(error, "Não foi possível salvar as metas.");
    revalidatePath("/gestao");
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar as metas.");
  }
}

const COST_CLASSES = ["variable", "fixed", "tax", "prolabore"] as const;

/** Classe de custo de uma categoria de despesa da Empresa (para a DRE). */
export async function setCategoryCostClass(
  categoryId: string,
  costClass: string
): Promise<ActionResult> {
  try {
    const { supabase, user } = await userClient();
    if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

    const value = (COST_CLASSES as readonly string[]).includes(costClass) ? costClass : null;

    const { error } = await supabase.rpc("ff_set_category_cost_class", {
      p_id: categoryId,
      p_class: value,
    });

    if (error) return fail(error, "Não foi possível salvar a classificação.");
    revalidatePath("/categorias");
    revalidatePath("/gestao");
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar a classificação.");
  }
}

/** Pró-labore, retirada de lucros ou aporte: duas transações ligadas (PF x PJ). */
export async function createScopeTransfer(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, user } = await userClient();
    if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };

    const kind = String(formData.get("kind") ?? "");
    const fromAccount = String(formData.get("from_account") ?? "");
    const toAccount = String(formData.get("to_account") ?? "");
    const amount = parseAmount(String(formData.get("amount") ?? ""));
    const date = String(formData.get("date") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim().slice(0, 120);

    if (!["prolabore", "withdrawal", "contribution"].includes(kind)) {
      return { ok: false, error: "Escolha o tipo de movimentação." };
    }
    if (!fromAccount || !toAccount) return { ok: false, error: "Escolha as duas contas." };
    if (!(Number.isFinite(amount) && amount > 0)) {
      return { ok: false, error: "O valor deve ser maior que zero." };
    }
    if (!isRealDate(date)) return { ok: false, error: "Informe uma data válida." };

    const { error } = await supabase.rpc("ff_scope_transfer", {
      p_kind: kind,
      p_from_account: fromAccount,
      p_to_account: toAccount,
      p_amount: Math.round(amount * 100) / 100,
      p_date: date,
      p_description: description,
    });

    if (error) return fail(error, "Não foi possível registrar a movimentação.");
    refreshAll();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível registrar a movimentação.");
  }
}
