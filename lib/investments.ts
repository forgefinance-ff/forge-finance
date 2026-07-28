import { createClient } from "@/lib/supabase/server";

export type Investment = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  invested_amount: number;
  current_amount: number;
  institution: string;
  created_at: string;
  updated_at: string;
};

type CreateInvestmentInput = {
  name: string;
  type: string;
  invested_amount: number;
  current_amount: number;
  institution: string;
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
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as Investment[];
}

export async function createInvestment(input: CreateInvestmentInput) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuário não autenticado.");
  }

  const { error } = await supabase.from("investments").insert({
    user_id: user.id,
    name: input.name,
    type: input.type,
    invested_amount: input.invested_amount,
    current_amount: input.current_amount,
    institution: input.institution,
  });

  if (error) {
    console.error(error);
    throw error;
  }
}

export async function deleteInvestment(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}