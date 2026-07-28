"use client";

import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090B] px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Forge Finance
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Faça login para continuar.
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}