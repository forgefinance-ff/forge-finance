/** Empresa: clientes, contas a pagar/receber e impostos do MEI. */
import { z } from "zod";

import { todayInBrazil } from "@/lib/dates";
import { normalizeBrPhone } from "@/lib/phone";
import { dbFail, parseInput, ServiceError, type ServiceCtx } from "@/lib/services/context";
import {
  dateString,
  id,
  optionalAmount,
  optionalDate,
  optionalId,
  optionalText,
  positiveAmount,
  text,
} from "@/lib/services/schemas";

/* ---------------- clientes ---------------- */

export const customerInput = z.object({
  name: text("o nome do cliente", 120),
  phone: z
    .union([z.null(), z.undefined(), z.string()])
    .transform((value, ctx) => {
      const raw = (value ?? "").trim();
      if (!raw) return null;
      const phone = normalizeBrPhone(raw);
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
    .union([z.null(), z.undefined(), z.string()])
    .transform((v) => (v ?? "").trim())
    .refine((v) => v.length <= 160, "E-mail muito longo.")
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido.")
    .transform((v) => v || null),
  notes: optionalText(1000, "As observações"),
});

export type CustomerInput = z.input<typeof customerInput>;

export async function createCustomer(ctx: ServiceCtx, raw: CustomerInput) {
  const input = parseInput(customerInput, raw);

  const { data, error } = await ctx.db
    .from("customers")
    .insert({ ...input, user_id: ctx.userId, scope: "business" })
    .select("id")
    .single();

  if (error) dbFail(error, "Não foi possível cadastrar o cliente.");
  return data.id as string;
}

export async function updateCustomer(ctx: ServiceCtx, customerId: string, raw: CustomerInput) {
  parseInput(id("Cliente não encontrado."), customerId);
  const input = parseInput(customerInput, raw);

  const { data, error } = await ctx.db
    .from("customers")
    .update(input)
    .eq("id", customerId)
    .eq("user_id", ctx.userId)
    .select("id");

  if (error) dbFail(error, "Não foi possível salvar o cliente.");
  if (!data?.length) throw new ServiceError("Cliente não encontrado.");
}

export async function setCustomerArchived(ctx: ServiceCtx, customerId: string, archived: boolean) {
  parseInput(id("Cliente não encontrado."), customerId);

  const { data, error } = await ctx.db
    .from("customers")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", customerId)
    .eq("user_id", ctx.userId)
    .select("id");

  if (error) dbFail(error, "Não foi possível atualizar o cliente.");
  if (!data?.length) throw new ServiceError("Cliente não encontrado.");
}

/** Cliente com cobranças não pode ser excluído (só arquivado). */
export async function deleteCustomer(ctx: ServiceCtx, customerId: string) {
  parseInput(id("Cliente não encontrado."), customerId);

  const { count } = await ctx.db
    .from("payables")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("user_id", ctx.userId);

  if ((count ?? 0) > 0) {
    throw new ServiceError("Este cliente tem cobranças registradas. Arquive em vez de excluir.");
  }

  const { data, error } = await ctx.db
    .from("customers")
    .delete()
    .eq("id", customerId)
    .eq("user_id", ctx.userId)
    .select("id");

  if (error) dbFail(error, "Não foi possível excluir o cliente.");
  if (!data?.length) throw new ServiceError("Cliente não encontrado.");
}

/* ---------------- contas a pagar e a receber ---------------- */

export const payableInput = z
  .object({
    kind: z.enum(["payable", "receivable"], { message: "Escolha se é a pagar ou a receber." }),
    description: text("a descrição", 120),
    amount: positiveAmount(),
    due_date: dateString("Informe uma data de vencimento válida."),
    account_id: optionalId,
    category_id: optionalId,
    customer_id: optionalId,
    recurrence: z.enum(["none", "monthly"]).catch("none"),
    notes: optionalText(1000, "As observações"),
  })
  .refine((data) => !data.customer_id || data.kind === "receivable", {
    message: "Cliente só pode ser informado em contas a receber.",
  });

export type PayableInput = z.input<typeof payableInput>;

export async function createPayable(ctx: ServiceCtx, raw: PayableInput) {
  const input = parseInput(payableInput, raw);

  if (input.customer_id && ctx.scope !== "business") {
    throw new ServiceError("Clientes só existem no escopo Empresa.");
  }

  const { data, error } = await ctx.db
    .from("payables")
    .insert({ ...input, user_id: ctx.userId, scope: ctx.scope })
    .select("id")
    .single();

  if (error) dbFail(error, "Não foi possível salvar a conta.");
  return data.id as string;
}

/** Só contas pendentes podem ser editadas (as pagas já viraram transação). */
export async function updatePayable(ctx: ServiceCtx, payableId: string, raw: PayableInput) {
  parseInput(id("Conta não encontrada."), payableId);
  const input = parseInput(payableInput, raw);

  const { data, error } = await ctx.db
    .from("payables")
    .update(input)
    .eq("id", payableId)
    .eq("user_id", ctx.userId)
    .eq("status", "pending")
    .select("id");

  if (error) dbFail(error, "Não foi possível salvar a conta.");
  if (!data?.length) throw new ServiceError("Só é possível editar contas pendentes.");
}

/**
 * Marca como paga/recebida: cria a transação (mesma regra do app), ajusta o
 * saldo e gera a próxima se for mensal. Tudo numa operação no banco.
 */
export async function settlePayable(
  ctx: ServiceCtx,
  payableId: string,
  accountId: string | null,
  paidAt: string
) {
  parseInput(id("Conta não encontrada."), payableId);
  parseInput(dateString(), paidAt);
  await ctx.atomic("settle_payable", { id: payableId, account_id: accountId, date: paidAt });
}

export async function cancelPayable(ctx: ServiceCtx, payableId: string) {
  parseInput(id("Conta não encontrada."), payableId);

  const { data, error } = await ctx.db
    .from("payables")
    .update({ status: "canceled" })
    .eq("id", payableId)
    .eq("user_id", ctx.userId)
    .eq("status", "pending")
    .select("id");

  if (error) dbFail(error, "Não foi possível cancelar a conta.");
  if (!data?.length) throw new ServiceError("Só é possível cancelar contas pendentes.");
}

/** Contas pagas ficam como histórico da transação criada. */
export async function deletePayable(ctx: ServiceCtx, payableId: string) {
  parseInput(id("Conta não encontrada."), payableId);

  const { data, error } = await ctx.db
    .from("payables")
    .delete()
    .eq("id", payableId)
    .eq("user_id", ctx.userId)
    .neq("status", "paid")
    .select("id");

  if (error) dbFail(error, "Não foi possível excluir a conta.");
  if (!data?.length) throw new ServiceError("Contas já pagas não podem ser excluídas.");
}

/* ---------------- impostos do MEI ---------------- */

export const meiSettingsInput = z.object({
  activity: z.enum(["servicos", "comercio", "ambos"], { message: "Escolha a atividade." }),
  das_due_day: z
    .union([z.number(), z.string()])
    .transform((v) => Number(v))
    .refine(
      (v) => Number.isInteger(v) && v >= 1 && v <= 31,
      "O dia de vencimento do DAS deve ser entre 1 e 31."
    ),
  annual_limit: optionalAmount(positiveAmount("O limite anual")),
  das_amount: optionalAmount(positiveAmount("O valor do DAS")),
  opening_date: optionalDate("Data de abertura: informe uma data válida.").refine(
    (v) => !v || v <= todayInBrazil(),
    "A data de abertura não pode estar no futuro."
  ),
  dasn_due_date: optionalDate("Prazo da declaração anual: informe uma data válida."),
});

export type MeiSettingsInput = z.input<typeof meiSettingsInput>;

export async function saveMeiSettings(ctx: ServiceCtx, raw: MeiSettingsInput) {
  const input = parseInput(meiSettingsInput, raw);

  const { error } = await ctx.db
    .from("mei_settings")
    .upsert({ ...input, user_id: ctx.userId }, { onConflict: "user_id" });

  if (error) dbFail(error, "Não foi possível salvar as configurações.");
}

export const dasInput = z.object({
  competence: z
    .string()
    .regex(/^\d{4}-\d{2}-01$/, "Competência inválida.")
    .refine((v) => v <= todayInBrazil(), "Só é possível gerar competências até o mês atual."),
  amount: positiveAmount("O valor do DAS"),
  due_date: dateString("Informe uma data de vencimento válida."),
});

export async function generateDas(ctx: ServiceCtx, raw: z.input<typeof dasInput>) {
  const input = parseInput(dasInput, raw);

  const { data, error } = await ctx.db
    .from("mei_das_payments")
    .insert({ ...input, user_id: ctx.userId })
    .select("id")
    .single();

  if (error?.code === "23505") {
    throw new ServiceError("Já existe um DAS para esta competência.");
  }
  if (error) dbFail(error, "Não foi possível gerar o DAS.");
  return data.id as string;
}

/** Cria a despesa em "Impostos" (empresa) e ajusta o saldo, tudo no banco. */
export async function payDas(ctx: ServiceCtx, dasId: string, accountId: string, paidAt: string) {
  parseInput(id("Guia do DAS não encontrada."), dasId);
  parseInput(id("Escolha a conta da empresa."), accountId);
  parseInput(dateString(), paidAt);
  await ctx.atomic("pay_das", { id: dasId, account_id: accountId, date: paidAt });
}

/** Remove uma guia gerada por engano (só pendentes). */
export async function deleteDas(ctx: ServiceCtx, dasId: string) {
  parseInput(id("Guia do DAS não encontrada."), dasId);

  const { data, error } = await ctx.db
    .from("mei_das_payments")
    .delete()
    .eq("id", dasId)
    .eq("user_id", ctx.userId)
    .eq("status", "pending")
    .select("id");

  if (error) dbFail(error, "Não foi possível remover o DAS.");
  if (!data?.length) throw new ServiceError("Só é possível remover guias pendentes.");
}
