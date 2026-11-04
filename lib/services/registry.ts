/**
 * Cadastros simples (contas, categorias, cartões, metas e investimentos).
 * Todos herdam o escopo do contexto e sempre filtram pelo usuário.
 */
import { z } from "zod";
import { MOVEMENT_KINDS } from "@/lib/movement-kinds";

import { dbFail, parseInput, ServiceError, type ServiceCtx } from "@/lib/services/context";
import {
  anyAmount,
  hexColor,
  id,
  nonNegativeAmount,
  optionalAmount,
  optionalDate,
  optionalText,
  positiveAmount,
  text,
} from "@/lib/services/schemas";

async function deleteOwned(ctx: ServiceCtx, table: string, rowId: string, label: string) {
  parseInput(id(`${label} não encontrada.`), rowId);

  const { data, error } = await ctx.db
    .from(table)
    .delete()
    .eq("id", rowId)
    .eq("user_id", ctx.userId)
    .select("id");

  if (error) dbFail(error, `Não foi possível excluir: ${label.toLowerCase()}.`);
  if (!data?.length) throw new ServiceError(`${label} não encontrada.`);
}

/* ---------------- contas bancárias ---------------- */

export const accountInput = z.object({
  name: text("o nome da conta", 60),
  type: optionalText(40).transform((v) => v ?? "Conta Corrente"),
  color: hexColor.transform((v) => v ?? "#3B82F6"),
  initial_balance: optionalAmount(anyAmount("O saldo inicial")).transform((v) => v ?? 0),
});

export async function createAccount(ctx: ServiceCtx, raw: z.input<typeof accountInput>) {
  const input = parseInput(accountInput, raw);

  const { error } = await ctx.db.from("accounts").insert({
    user_id: ctx.userId,
    name: input.name,
    type: input.type,
    color: input.color,
    initial_balance: input.initial_balance,
    current_balance: input.initial_balance,
    scope: ctx.scope,
  });

  if (error) dbFail(error, "Não foi possível criar a conta.");
}

export const deleteAccount = (ctx: ServiceCtx, accountId: string) =>
  deleteOwned(ctx, "accounts", accountId, "Conta");

/* ---------------- categorias ---------------- */

export const categoryInput = z.object({
  name: text("o nome da categoria", 60),
  type: z.enum(["income", "expense"], { message: "Escolha se é de receita ou de despesa." }),
  color: hexColor.transform((v) => v ?? "#71717A"),
  icon: optionalText(8).transform((v) => v ?? "📁"),
  kind: z
    .union([z.null(), z.undefined(), z.literal(""), z.enum(MOVEMENT_KINDS)])
    .transform((v) => (v ? v : "regular")),
});

export async function createCategory(ctx: ServiceCtx, raw: z.input<typeof categoryInput>) {
  const input = parseInput(categoryInput, raw);

  const { data, error } = await ctx.db
    .from("categories")
    .insert({ ...input, user_id: ctx.userId, scope: ctx.scope })
    .select()
    .single();

  if (error) dbFail(error, "Não foi possível criar a categoria.");
  return data;
}

export const deleteCategory = (ctx: ServiceCtx, categoryId: string) =>
  deleteOwned(ctx, "categories", categoryId, "Categoria");

/* ---------------- cartões ---------------- */

/** Dia do mês (1 a 31) opcional. */
const day = (label: string) =>
  z.union([z.null(), z.undefined(), z.number(), z.string()]).transform((v, ctx) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 31) {
      ctx.addIssue({ code: "custom", message: `${label} deve ser entre 1 e 31.` });
      return z.NEVER;
    }
    return n;
  });

export const cardInput = z.object({
  name: text("o nome do cartão", 60),
  limit_amount: optionalAmount(nonNegativeAmount("O limite")),
  closing_day: day("O dia de fechamento"),
  due_day: day("O dia de vencimento"),
  color: hexColor.transform((v) => v ?? "#8B5CF6"),
});

export async function createCard(ctx: ServiceCtx, raw: z.input<typeof cardInput>) {
  const input = parseInput(cardInput, raw);

  const { error } = await ctx.db
    .from("cards")
    .insert({ ...input, user_id: ctx.userId, scope: ctx.scope });

  if (error) dbFail(error, "Não foi possível criar o cartão.");
}

export const deleteCard = (ctx: ServiceCtx, cardId: string) =>
  deleteOwned(ctx, "cards", cardId, "Cartão");

/* ---------------- metas ---------------- */

export const goalInput = z.object({
  title: text("o nome da meta", 80),
  target_amount: positiveAmount("O valor da meta"),
  current_amount: optionalAmount(nonNegativeAmount("O valor atual")).transform((v) => v ?? 0),
  deadline: optionalDate("Informe uma data limite válida."),
});

export async function createGoal(ctx: ServiceCtx, raw: z.input<typeof goalInput>) {
  const input = parseInput(goalInput, raw);

  const { error } = await ctx.db
    .from("goals")
    .insert({ ...input, user_id: ctx.userId, scope: ctx.scope });

  if (error) dbFail(error, "Não foi possível criar a meta.");
}

export async function updateGoal(
  ctx: ServiceCtx,
  goalId: string,
  raw: z.input<typeof goalInput>
) {
  parseInput(id("Meta não encontrada."), goalId);
  const input = parseInput(goalInput, raw);

  const { data, error } = await ctx.db
    .from("goals")
    .update(input)
    .eq("id", goalId)
    .eq("user_id", ctx.userId)
    .select("id");

  if (error) dbFail(error, "Não foi possível salvar a meta.");
  if (!data?.length) throw new ServiceError("Meta não encontrada.");
}

/** Soma (ou retira, se negativo) um valor do que já foi guardado na meta. */
export async function contributeToGoal(ctx: ServiceCtx, goalId: string, rawAmount: number) {
  parseInput(id("Meta não encontrada."), goalId);
  const amount = Math.round(Number(rawAmount) * 100) / 100;

  if (!Number.isFinite(amount) || amount === 0) {
    throw new ServiceError("Informe o valor a guardar na meta.");
  }

  const { data: goal } = await ctx.db
    .from("goals")
    .select("current_amount")
    .eq("id", goalId)
    .eq("user_id", ctx.userId)
    .maybeSingle();

  if (!goal) throw new ServiceError("Meta não encontrada.");

  const next = Math.round((Number(goal.current_amount ?? 0) + amount) * 100) / 100;
  if (next < 0) throw new ServiceError("A meta não tem esse valor guardado para retirar.");

  const { error } = await ctx.db
    .from("goals")
    .update({ current_amount: next })
    .eq("id", goalId)
    .eq("user_id", ctx.userId);

  if (error) dbFail(error, "Não foi possível atualizar a meta.");
  return next;
}

export const deleteGoal = (ctx: ServiceCtx, goalId: string) =>
  deleteOwned(ctx, "goals", goalId, "Meta");

/* ---------------- investimentos ---------------- */

export const investmentInput = z.object({
  name: text("o nome do investimento", 80),
  type: optionalText(40),
  invested_amount: optionalAmount(nonNegativeAmount("O valor investido")).transform((v) => v ?? 0),
  current_value: optionalAmount(nonNegativeAmount("O valor atual")),
  institution: optionalText(60),
});

export async function createInvestment(ctx: ServiceCtx, raw: z.input<typeof investmentInput>) {
  const input = parseInput(investmentInput, raw);

  const { error } = await ctx.db.from("investments").insert({
    ...input,
    current_value: input.current_value ?? input.invested_amount,
    user_id: ctx.userId,
    scope: ctx.scope,
  });

  if (error) dbFail(error, "Não foi possível criar o investimento.");
}

export const deleteInvestment = (ctx: ServiceCtx, investmentId: string) =>
  deleteOwned(ctx, "investments", investmentId, "Investimento");
