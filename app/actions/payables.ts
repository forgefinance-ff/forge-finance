"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, type ActionResult } from "@/lib/action-result";
import { isRealDate } from "@/lib/dates";
import { getActiveScope } from "@/lib/scope-server";
import { createClient } from "@/lib/supabase/server";

const optionalId = z
  .string()
  .trim()
  .transform((value) => value || null);

const payableSchema = z
  .object({
    kind: z.enum(["payable", "receivable"], { message: "Tipo inválido." }),
    description: z
      .string()
      .trim()
      .min(1, "Informe a descrição.")
      .max(120, "A descrição pode ter no máximo 120 caracteres."),
    amount: z
      .number({ message: "Informe o valor." })
      .finite("Informe o valor.")
      .positive("O valor deve ser maior que zero.")
      .max(10_000_000, "Valor muito alto.")
      .transform((value) => Math.round(value * 100) / 100),
    due_date: z.string().refine(isRealDate, "Informe uma data de vencimento válida."),
    account_id: optionalId,
    category_id: optionalId,
    customer_id: optionalId,
    recurrence: z.enum(["none", "monthly"]).catch("none"),
    notes: z
      .string()
      .trim()
      .max(1000, "As observações podem ter no máximo 1000 caracteres.")
      .transform((value) => value || null),
  })
  .refine((data) => !data.customer_id || data.kind === "receivable", {
    message: "Cliente só pode ser informado em contas a receber.",
  });

/** Aceita "1.234,56", "1234,56" e "1234.56". */
function parseAmount(raw: string): number {
  const value = raw.trim();
  if (!value) return Number.NaN;
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  return Number(normalized);
}

function readPayable(formData: FormData) {
  return payableSchema.safeParse({
    kind: String(formData.get("kind") ?? ""),
    description: String(formData.get("description") ?? ""),
    amount: parseAmount(String(formData.get("amount") ?? "")),
    due_date: String(formData.get("due_date") ?? ""),
    account_id: String(formData.get("account_id") ?? ""),
    category_id: String(formData.get("category_id") ?? ""),
    customer_id: String(formData.get("customer_id") ?? ""),
    recurrence: String(formData.get("recurrence") ?? "none"),
    notes: String(formData.get("notes") ?? ""),
  });
}

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");

  return { supabase, user };
}

function refresh() {
  revalidatePath("/contas-a-pagar-receber");
  revalidatePath("/clientes");
  revalidatePath("/dashboard");
}

export async function createPayable(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = readPayable(formData);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const scope = await getActiveScope();

    if (parsed.data.customer_id && scope !== "business") {
      return { ok: false, error: "Clientes só existem no escopo Empresa." };
    }

    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("payables")
      .insert({ ...parsed.data, user_id: user.id, scope });

    if (error) throw error;

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar a conta.");
  }
}

export async function updatePayable(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") ?? "");
    const parsed = readPayable(formData);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const { supabase, user } = await requireUser();

    // Só contas pendentes podem ser editadas (as pagas já viraram transação).
    const { data, error } = await supabase
      .from("payables")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id");

    if (error) throw error;
    if (!data?.length) {
      return { ok: false, error: "Só é possível editar contas pendentes." };
    }

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar a conta.");
  }
}

/**
 * Marca como paga/recebida: cria a transação (mesma regra do app, via
 * ff_create_transaction), ajusta o saldo e gera a próxima se for mensal.
 * Tudo numa única operação no banco.
 */
export async function settlePayable(
  id: string,
  accountId: string,
  paidAt: string
): Promise<ActionResult> {
  try {
    if (!accountId) return { ok: false, error: "Escolha a conta." };
    if (!isRealDate(paidAt)) return { ok: false, error: "Informe uma data válida." };

    const { supabase } = await requireUser();

    const { error } = await supabase.rpc("ff_settle_payable", {
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
    return fail(error, "Não foi possível registrar o pagamento.");
  }
}

export async function cancelPayable(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { data, error } = await supabase
      .from("payables")
      .update({ status: "canceled" })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id");

    if (error) throw error;
    if (!data?.length) return { ok: false, error: "Só é possível cancelar contas pendentes." };

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível cancelar a conta.");
  }
}

export async function deletePayable(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    // Contas pagas ficam como histórico da transação criada.
    const { data, error } = await supabase
      .from("payables")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .neq("status", "paid")
      .select("id");

    if (error) throw error;
    if (!data?.length) {
      return { ok: false, error: "Contas já pagas não podem ser excluídas." };
    }

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível excluir a conta.");
  }
}
