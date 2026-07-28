"use client";

import { RegisterForm } from "@/components/auth/register-form";

export default function CadastroPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090B] px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">
            Forge Finance
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Crie sua conta para começar.
          </p>
        </div>

        <RegisterForm />
      </div>
    </main>
  );
}