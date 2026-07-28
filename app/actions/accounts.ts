"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createAccount(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const name = String(formData.get("name"));
  const type = String(formData.get("type"));
  const color = String(formData.get("color"));
  const initialBalance = Number(formData.get("initial_balance"));

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    type,
    color,
    initial_balance: initialBalance,
    current_balance: initialBalance,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/contas");
}

export async function deleteAccount(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }

  revalidatePath("/contas");
}