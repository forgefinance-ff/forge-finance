import { cache } from "react";
import { createClient, getAuthUser } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";

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

export const getGoals = cache(async function getGoals() {
  const supabase = await createClient();

  const user = await getAuthUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Goal[];
});
