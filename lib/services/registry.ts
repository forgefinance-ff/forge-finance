/**
 * Cadastros simples (contas, categorias, cartões, metas e investimentos).
 * Todos herdam o escopo do contexto e sempre filtram pelo usuário.
 */
import { z } from "zod";
import { MOVEMENT_KINDS } from "@/lib/movement-kinds";
import { ASSET_CLASSES, ASSET_CLASS_TYPE, assetCurrency } from "@/lib/market/symbols";
import { parseAmount } from "@/lib/money";

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

/** Cria a conta e devolve o id (o bot usa para lançar logo em seguida). */
export async function createAccount(ctx: ServiceCtx, raw: z.input<typeof accountInput>): Promise<string> {
  const input = parseInput(accountInput, raw);

  const { data, error } = await ctx.db
    .from("accounts")
    .insert({
      user_id: ctx.userId,
      name: input.name,
      type: input.type ?? "Conta Corrente",
      color: input.color ?? "#3B82F6",
      initial_balance: input.initial_balance ?? 0,
      current_balance: input.initial_balance ?? 0,
      scope: ctx.scope,
    })
    .select("id")
    .single();

  if (error || !data) dbFail(error, "Não foi possível criar a conta.");
  return String(data.id);
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

/** Atualiza o valor de um investimento manual (renda fixa, previdência etc.). */
export async function updateInvestmentValue(ctx: ServiceCtx, investmentId: string, rawValue: unknown) {
  parseInput(id("Investimento não encontrado."), investmentId);
  const value = parseInput(nonNegativeAmount("O valor atual"), rawValue);

  const { data, error } = await ctx.db
    .from("investments")
    .update({ current_value: value })
    .eq("id", investmentId)
    .eq("user_id", ctx.userId)
    .is("ticker", null)
    .select("id");

  if (error) dbFail(error, "Não foi possível atualizar o valor.");
  if (!data?.length) throw new ServiceError("Investimento não encontrado.");
}

/* ---------------- bolsa: posições com cotação automática ---------------- */

/** Número com casas livres (quantidade de cripto, preço de centavos). */
const decimal = (label: string, { allowZero = false } = {}) =>
  z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "number" ? v : parseAmount(v)))
    .refine(
      (v) => Number.isFinite(v) && (allowZero ? v >= 0 : v > 0),
      allowZero ? `${label} não pode ser negativo.` : `${label} deve ser maior que zero.`
    )
    .refine((v) => v <= 1_000_000_000, `${label} está alto demais.`)
    .transform((v) => Math.round(v * 1e8) / 1e8);

export const tradeInput = z.object({
  side: z.enum(["buy", "sell"], { message: "Escolha compra ou venda." }),
  quantity: decimal("A quantidade"),
  price: decimal("O preço", { allowZero: true }),
  fees: optionalAmount(nonNegativeAmount("A taxa")).transform((v) => v ?? 0),
  traded_at: optionalDate("Informe uma data válida."),
  /** Dólar do dia (só ativos do exterior). */
  fx_rate: z.number().positive().default(1),
});

const TRADE_ERRORS: Record<string, string> = {
  insufficient_quantity: "Você está vendendo mais do que tem desse ativo.",
  investment_not_found: "Investimento não encontrado.",
  not_market_investment: "Esse investimento não é da bolsa.",
  invalid_quantity: "Quantidade inválida.",
  invalid_price: "Preço inválido.",
};

/** Registra compra ou venda e atualiza quantidade, preço médio e custo (tudo numa transação). */
export async function recordTrade(
  ctx: ServiceCtx,
  investmentId: string,
  raw: z.input<typeof tradeInput>
) {
  parseInput(id("Investimento não encontrado."), investmentId);
  const input = parseInput(tradeInput, raw);

  if (input.traded_at && input.traded_at > new Date().toISOString().slice(0, 10)) {
    throw new ServiceError("A data da operação não pode ser no futuro.");
  }

  const { error } = await ctx.db.rpc("ff_investment_trade", {
    p_investment_id: investmentId,
    p_side: input.side,
    p_quantity: input.quantity,
    p_price: input.price,
    p_fx_rate: input.fx_rate,
    p_fees: input.fees,
    p_traded_at: input.traded_at ?? new Date().toISOString().slice(0, 10),
  });

  if (error) {
    const known = Object.entries(TRADE_ERRORS).find(([code]) => error.message?.includes(code));
    if (known) throw new ServiceError(known[1]);
    dbFail(error, "Não foi possível registrar a operação.");
  }
}

export const marketInvestmentInput = z.object({
  ticker: text("o código do ativo", 16),
  asset_class: z.enum(ASSET_CLASSES, { message: "Escolha o tipo do ativo." }),
  name: optionalText(80),
  institution: optionalText(60),
});

/**
 * Cria a posição (ou reaproveita a do mesmo código) e registra a primeira compra.
 * O código já deve vir normalizado e conferido com o provedor de cotação.
 */
export async function createMarketInvestment(
  ctx: ServiceCtx,
  raw: z.input<typeof marketInvestmentInput>,
  firstTrade: z.input<typeof tradeInput>,
  quote: { price: number; currency: string } | null
): Promise<string> {
  const input = parseInput(marketInvestmentInput, raw);
  const ticker = input.ticker.toUpperCase();

  const { data: existing, error: findError } = await ctx.db
    .from("investments")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("scope", ctx.scope)
    .eq("ticker", ticker)
    .eq("asset_class", input.asset_class)
    .maybeSingle();

  if (findError) dbFail(findError, "Não foi possível salvar o ativo.");

  let investmentId = existing?.id ? String(existing.id) : null;
  let created = false;

  if (!investmentId) {
    const { data, error } = await ctx.db
      .from("investments")
      .insert({
        user_id: ctx.userId,
        scope: ctx.scope,
        name: input.name || ticker,
        type: ASSET_CLASS_TYPE[input.asset_class],
        institution: input.institution,
        ticker,
        asset_class: input.asset_class,
        currency: assetCurrency(input.asset_class),
        quantity: 0,
        avg_price: 0,
        invested_amount: 0,
        current_value: 0,
        last_price: quote?.price ?? null,
        last_price_at: quote ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error || !data) {
      if (error?.message?.includes("ticker") || error?.code === "42703") {
        throw new ServiceError("A aba de bolsa ainda está sendo ativada. Tente de novo em alguns minutos.");
      }
      dbFail(error, "Não foi possível salvar o ativo.");
    }
    investmentId = String(data.id);
    created = true;
  }

  try {
    await recordTrade(ctx, investmentId, { ...firstTrade, side: "buy" });
  } catch (error) {
    if (created) {
      await ctx.db.from("investments").delete().eq("id", investmentId).eq("user_id", ctx.userId);
    }
    throw error;
  }

  return investmentId;
}
