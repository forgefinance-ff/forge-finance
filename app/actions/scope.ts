"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient, getAuthUser } from "@/lib/supabase/server";
import { canUseBusiness } from "@/lib/scope-server";
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

export async function setActiveScope(value: string): Promise<{ ok: true } | { ok: false; reason: "pro" }> {
  const scope = parseScope(value);
  if (scope === "business" && !(await canUseBusiness())) return { ok: false, reason: "pro" };

  const cookieStore = await cookies();
  cookieStore.set(SCOPE_COOKIE, scope, cookieOptions);

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Cria categorias padrão de empresa e (opcionalmente) a conta "Caixa da empresa". */
export async function createBusinessDefaults(formData: FormData) {
  const supabase = await createClient();

  const user = await getAuthUser();

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
