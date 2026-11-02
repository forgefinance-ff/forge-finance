import { createClient } from "@/lib/supabase/server";
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
    .eq("scope", await getActiveScope())
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []) as Goal[];
}
