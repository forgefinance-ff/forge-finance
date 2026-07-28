import { createClient } from "@/lib/supabase/server";

export type Account = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  color: string;
  initial_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
};

export async function getAccounts() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Account[];
}

type CreateAccountInput = {
  name: string;
  type: string;
  color: string;
  initial_balance: number;
};

export async function createAccount(input: CreateAccountInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: input.name,
    type: input.type,
    color: input.color,
    initial_balance: input.initial_balance,
    current_balance: input.initial_balance,
  });

  if (error) {
    throw error;
  }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}