/**
 * Camada de serviços: as regras de cada área do Forge Finance num só lugar.
 * O app (usuário logado, com RLS) e o bot do WhatsApp (chave de serviço,
 * em nome do usuário vinculado) chamam as MESMAS funções.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { Scope } from "@/lib/scope";

export type Db = SupabaseClient;

/** Operações que mexem em saldo: sempre pelas funções atômicas do banco. */
export type AtomicFn = "create_transaction" | "delete_transaction" | "settle_payable" | "pay_das";

export type ServiceCtx = {
  db: Db;
  userId: string;
  /** Escopo em que a operação acontece (Pessoal ou Empresa). */
  scope: Scope;
  atomic: (fn: AtomicFn, args: Record<string, unknown>) => Promise<unknown>;
};

/** Erro com mensagem pronta para o usuário (em português). */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}

export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new ServiceError(parsed.error.issues[0].message);
  return parsed.data;
}

/** Erros do Postgres: as funções do app já levantam mensagens em português. */
export function dbFail(error: { message?: string; code?: string } | null, fallback: string): never {
  if (error?.code === "23503") {
    throw new ServiceError("Este item está ligado a outros registros e não pode ser excluído.");
  }
  if (error?.code === "23505") {
    throw new ServiceError("Já existe um registro igual.");
  }
  throw new ServiceError(error?.message || fallback);
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = String((error as { message: unknown }).message);
    if (message) return message;
  }
  return fallback;
}

const RPC: Record<AtomicFn, (a: Record<string, unknown>) => [string, Record<string, unknown>]> = {
  create_transaction: (a) => [
    "ff_create_transaction",
    {
      p_account_id: a.account_id,
      p_category_id: a.category_id ?? null,
      p_type: a.type,
      p_title: a.title,
      p_description: a.description,
      p_amount: a.amount,
      p_date: a.date,
    },
  ],
  delete_transaction: (a) => ["ff_delete_transaction", { p_id: a.id }],
  settle_payable: (a) => [
    "ff_settle_payable",
    { p_id: a.id, p_account_id: a.account_id ?? null, p_date: a.date },
  ],
  pay_das: (a) => ["ff_pay_das", { p_id: a.id, p_account_id: a.account_id, p_date: a.date }],
};

/** Usuário logado no app: chama a função do banco diretamente (auth.uid() = ele). */
export function appAtomic(db: Db): ServiceCtx["atomic"] {
  return async (fn, args) => {
    const [name, params] = RPC[fn](args);
    const { data, error } = await db.rpc(name, params);
    if (error) dbFail(error, "Não foi possível concluir a operação.");
    return data;
  };
}

/** Bot (chave de serviço): mesma função, executada em nome do usuário vinculado. */
export function botAtomic(db: Db, userId: string): ServiceCtx["atomic"] {
  return async (fn, args) => {
    const { data, error } = await db.rpc("ff_bot_rpc", {
      p_user_id: userId,
      p_fn: fn,
      p_args: args,
    });
    if (error) dbFail(error, "Não foi possível concluir a operação.");
    return data;
  };
}
