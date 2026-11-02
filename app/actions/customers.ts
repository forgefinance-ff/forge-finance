"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { fail, type ActionResult } from "@/lib/action-result";
import { normalizeBrPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do cliente.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const phone = normalizeBrPhone(value);
      if (!phone) {
        ctx.addIssue({
          code: "custom",
          message: "Telefone inválido. Use DDD + número, ex.: (11) 91234-5678.",
        });
        return z.NEVER;
      }
      return phone;
    }),
  email: z
    .string()
    .trim()
    .max(160, "E-mail muito longo.")
    .refine((value) => !value || z.email().safeParse(value).success, "E-mail inválido.")
    .transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .max(1000, "As observações podem ter no máximo 1000 caracteres.")
    .transform((value) => value || null),
});

function readCustomer(formData: FormData) {
  return customerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
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
  revalidatePath("/clientes");
}

export async function createCustomer(formData: FormData): Promise<ActionResult> {
  try {
    const parsed = readCustomer(formData);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("customers")
      .insert({ ...parsed.data, user_id: user.id, scope: "business" });

    if (error) throw error;

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível cadastrar o cliente.");
  }
}

export async function updateCustomer(formData: FormData): Promise<ActionResult> {
  try {
    const id = String(formData.get("id") ?? "");
    if (!id) return { ok: false, error: "Cliente não encontrado." };

    const parsed = readCustomer(formData);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const { supabase, user } = await requireUser();

    const { data, error } = await supabase
      .from("customers")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) throw error;
    if (!data?.length) return { ok: false, error: "Cliente não encontrado." };

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível salvar o cliente.");
  }
}

export async function setCustomerArchived(
  id: string,
  archived: boolean
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase
      .from("customers")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível atualizar o cliente.");
  }
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();

    const { count } = await supabase
      .from("payables")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id)
      .eq("user_id", user.id);

    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: "Este cliente tem cobranças registradas. Arquive em vez de excluir.",
      };
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error, "Não foi possível excluir o cliente.");
  }
}
