"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, type ActionResult } from "@/lib/action-result";
import { isRealDate, todayInBrazil } from "@/lib/dates";
import { parseAmount } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  return { supabase, user };
}

function refresh() {
  revalidatePath("/impostos");
  revalidatePath("/dashboard");
}

const optionalAmount = (label: string) =>
  z
    .string()
    .trim()
    .transform((raw, ctx) => {
      if (!raw) return null;
      const value = parseAmount(raw);
      if (!Number.isFinite(value) || value <= 0) {
        ctx.addIssue({ code: "custom", message: `${label} deve ser maior que zero.` });
        return z.NEVER;
      }
      return Math.round(value * 100) / 100;
    });

const optionalDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => !value || isRealDate(value), `${label}: informe uma data válida.`)
    .transform((value) => value || null);

const settingsSchema = z.object({
  activity: z.enum(["servicos", "comercio", "ambos"], { message: "Escolha a atividade." }),
  das_due_day: z.coerce
    .number({ message: "Informe o dia de vencimento do DAS." })
    .int("O dia de vencimento deve ser um número inteiro.")
    .min(1, "O dia de vencimento deve ser entre 1 e 31.")
    .max(31, "O dia de vencimento deve ser entre 1 e 31."),
  annual_limit: optionalAmount("O limite anual"),
  das_amount: optionalAmount("O valor do DAS"),
  opening_date: optionalDate("Data de abertura").refine(
    (value) => !value || value <= todayInBrazil(),
    "A data de abertura não pode estar no futuro."
  ),
  dasn_due_date: optionalDate("Prazo da declaração anual"),
});

export async function saveMeiSettings(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = settingsSchema.safeParse({
      activity: String(formData.get("activity") ?? ""),
      das_due_day: String(formData.get("das_due_day") ?? ""),
      annual_limit: String(formData.get("annual_limit") ?? ""),
      das_amount: String(formData.get("das_amount") ?? ""),
      opening_date: String(formData.get("opening_date") ?? ""),
      dasn_due_date: String(formData.get("dasn_due_date") ?? ""),
    });

    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("mei_settings")
      .upsert({ ...parsed.data, user_id: user.id }, { onConflict: "user_id" });

    if (error) throw error;

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar as configurações.");
  }
}

export async function generateDas(formData: FormData): Promise<ActionResult> {
  try {
    const competence = String(formData.get("competence") ?? "");
    const amount = parseAmount(String(formData.get("amount") ?? ""));
    const dueDate = String(formData.get("due_date") ?? "");

    if (!/^\d{4}-\d{2}-01$/.test(competence) || !isRealDate(competence)) {
      return { ok: false, error: "Competência inválida." };
    }
    if (competence > todayInBrazil()) {
      return { ok: false, error: "Só é possível gerar competências até o mês atual." };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: "O valor do DAS deve ser maior que zero." };
    }
    if (!isRealDate(dueDate)) {
      return { ok: false, error: "Informe uma data de vencimento válida." };
    }

    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("mei_das_payments").insert({
      user_id: user.id,
      competence,
      amount: Math.round(amount * 100) / 100,
      due_date: dueDate,
    });

    if (error?.code === "23505") {
      return { ok: false, error: "Já existe um DAS para esta competência." };
    }
    if (error) throw error;

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível gerar o DAS.");
  }
}

/** Cria a despesa em "Impostos" (empresa) e ajusta o saldo, tudo no banco. */
export async function payDas(id: string, accountId: string, paidAt: string): Promise<ActionResult> {
  try {
    if (!accountId) return { ok: false, error: "Escolha a conta da empresa." };
    if (!isRealDate(paidAt)) return { ok: false, error: "Informe uma data válida." };

    const { supabase } = await requireUser();

    const { error } = await supabase.rpc("ff_pay_das", {
      p_id: id,
      p_account_id: accountId,
      p_date: paidAt,
    });

    if (error) throw error;

    refresh();
    revalidatePath("/transacoes");
    revalidatePath("/contas");
    revalidatePath("/relatorios");
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível registrar o pagamento do DAS.");
  }
}

/** Remove uma guia gerada por engano (só pendentes). */
export async function deleteDas(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { data, error } = await supabase
      .from("mei_das_payments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id");

    if (error) throw error;
    if (!data?.length) return { ok: false, error: "Só é possível remover guias pendentes." };

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível remover o DAS.");
  }
}
