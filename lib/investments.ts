import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";

export type Investment = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  invested_amount: number;
  current_value: number;
  institution: string;
  created_at: string;
  updated_at: string;
};

export async function getInvestments() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("user_id", user.id)
    .eq("scope", await getActiveScope())
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Investment[];
}
