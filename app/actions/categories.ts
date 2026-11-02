"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveScope } from "@/lib/scope-server";

export async function createCategory(formData: FormData) {
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
  const icon = String(formData.get("icon"));

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      name,
      type,
      color,
      icon,
      scope: await getActiveScope(),
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/transacoes");
  revalidatePath("/categorias");
  revalidatePath("/dashboard");

  return data;
}

export async function deleteCategory(formData: FormData) {
  const supabase = await createClient();

  const id = String(formData.get("id"));

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/transacoes");
  revalidatePath("/dashboard");
}