"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  BUSINESS_ONBOARDING_COOKIE,
  parseScope,
  SCOPE_COOKIE,
} from "@/lib/scope";

const ONE_YEAR = 60 * 60 * 24 * 365;

const cookieOptions = {
  path: "/",
  maxAge: ONE_YEAR,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

export async function setActiveScope(value: string) {
  const cookieStore = await cookies();
  cookieStore.set(SCOPE_COOKIE, parseScope(value), cookieOptions);

  revalidatePath("/", "layout");
}

/** Cria categorias padrão de empresa e (opcionalmente) a conta "Caixa da empresa". */
export async function createBusinessDefaults(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Usuário não autenticado.");

  const { error } = await supabase.rpc("ff_seed_business_defaults", {
    p_create_account: formData.get("create_account") === "on",
  });

  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(BUSINESS_ONBOARDING_COOKIE, "done", cookieOptions);

  revalidatePath("/", "layout");
}

export async function dismissBusinessDefaults() {
  const cookieStore = await cookies();
  cookieStore.set(BUSINESS_ONBOARDING_COOKIE, "dismissed", cookieOptions);

  revalidatePath("/", "layout");
}
