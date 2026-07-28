import { createClient } from "@/lib/supabase/server";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  created_at: string;
  updated_at: string;
};

export async function getGoals() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Goal[];
}

type CreateGoalInput = {
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
};

export async function createGoal(input: CreateGoalInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    title: input.title,
    target_amount: input.target_amount,
    current_amount: input.current_amount,
    deadline: input.deadline,
  });

  if (error) throw error;
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}