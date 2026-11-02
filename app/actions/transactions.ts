"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";
import { isRealDate } from "@/lib/dates";
import { insertTransactionWithBalance } from "@/lib/transactions";

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const account_id = String(formData.get("account_id") ?? "");
  const category_id = String(formData.get("category_id") ?? "");
  const type = String(formData.get("type"));

  const description = String(formData.get("description") ?? "").trim();

  const amount = Number(formData.get("amount"));
  const transaction_date = String(formData.get("transaction_date") ?? "");

  if (!account_id) throw new Error("Escolha uma conta.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor deve ser maior que zero.");
  }
  if (!isRealDate(transaction_date)) throw new Error("Informe uma data válida.");

  // A conta precisa ser do escopo ativo (Pessoal/Empresa).
  const { data: account } = await supabase
    .from("accounts")
    .select("scope")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!account || account.scope !== (await getActiveScope())) {
    throw new Error("Esta conta não pertence ao escopo ativo.");
  }

  await insertTransactionWithBalance(supabase, {
    account_id,
    category_id: category_id || null,
    type,
    title: description,
    description,
    amount,
    transaction_date,
  });

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));

  // Estorna o saldo e apaga a transação numa única operação no banco.
  const { error } = await supabase.rpc("ff_delete_transaction", { p_id: id });

  if (error) throw new Error(error.message);

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}