"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { GUIDE_SKIP_COOKIE } from "@/lib/guide";

const cookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/** "Fazer depois": para de abrir o guia sozinho e esconde a barra de progresso. */
export async function skipGuide() {
  (await cookies()).set(GUIDE_SKIP_COOKIE, "1", cookieOptions);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
