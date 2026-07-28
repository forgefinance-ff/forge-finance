import { createClient } from "@/lib/supabase/server";

export type Card = {
  id: string;
  user_id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at: string;
  updated_at: string;
};

export async function getCards() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Card[];
}

type CreateCardInput = {
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color: string;
};

export async function createCard(input: CreateCardInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase.from("cards").insert({
    user_id: user.id,
    name: input.name,
    limit_amount: input.limit_amount,
    closing_day: input.closing_day,
    due_day: input.due_day,
    color: input.color,
  });

  if (error) {
    throw error;
  }
}

export async function deleteCard(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("cards")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}