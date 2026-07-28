"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createTransaction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const account_id = String(formData.get("account_id"));
  const category_id = String(formData.get("category_id"));
  const type = String(formData.get("type"));

  const title = String(formData.get("description"));
  const description = String(formData.get("description"));

  const amount = Number(formData.get("amount"));
  const transaction_date = String(formData.get("transaction_date"));

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    category_id,
    type,
    title,
    description,
    amount,
    transaction_date,
  });

  if (error) throw error;

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("current_balance")
    .eq("id", account_id)
    .single();

  if (accountError) throw accountError;

  const novoSaldo =
    type === "income"
      ? Number(account.current_balance) + amount
      : Number(account.current_balance) - amount;

  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      current_balance: novoSaldo,
    })
    .eq("id", account_id);

  if (updateError) throw updateError;

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}

export async function deleteTransaction(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));

  const { data: transaction, error: transactionError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (transactionError) throw transactionError;

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("current_balance")
    .eq("id", transaction.account_id)
    .single();

  if (accountError) throw accountError;

  const novoSaldo =
    transaction.type === "income"
      ? Number(account.current_balance) - Number(transaction.amount)
      : Number(account.current_balance) + Number(transaction.amount);

  const { error: updateError } = await supabase
    .from("accounts")
    .update({
      current_balance: novoSaldo,
    })
    .eq("id", transaction.account_id);

  if (updateError) throw updateError;

  const { error: deleteError } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  revalidatePath("/dashboard");
}