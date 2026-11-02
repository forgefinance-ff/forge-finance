"use client";

import { useTransition } from "react";
import { Building2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  createBusinessDefaults,
  dismissBusinessDefaults,
} from "@/app/actions/scope";
import { Button } from "@/components/ui/button";

const BUSINESS_CATEGORIES = [
  "Vendas",
  "Serviços prestados",
  "Fornecedores",
  "Marketing",
  "Ferramentas e software",
  "Impostos",
  "Pró-labore",
  "Equipamentos",
  "Outros",
];

/** Oferta (com confirmação) de categorias e conta padrão na 1ª visita ao escopo Empresa. */
export function BusinessOnboarding() {
  const [isPending, startTransition] = useTransition();

  function create(formData: FormData) {
    startTransition(async () => {
      try {
        await createBusinessDefaults(formData);
        toast.success("Categorias da empresa criadas.");
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "Não foi possível criar os padrões da empresa."
        );
      }
    });
  }

  function dismiss() {
    startTransition(async () => {
      await dismissBusinessDefaults();
    });
  }

  return (
    <section
      aria-labelledby="business-onboarding-title"
      className="mb-6 rounded-[22px] border border-brand-bright/30 bg-surface p-6 shadow-[var(--shadow-panel)]"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-bright/30 bg-brand/15 text-brand-soft">
          <Building2Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <h2
            id="business-onboarding-title"
            className="text-lg font-semibold text-foreground"
          >
            Bem-vindo ao modo Empresa
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Aqui ficam as finanças do seu MEI, separadas das pessoais. Quer que
            eu crie as categorias padrão de empresa?
          </p>

          <ul className="mt-3 flex flex-wrap gap-2">
            {BUSINESS_CATEGORIES.map((name) => (
              <li
                key={name}
                className="rounded-full border border-line bg-tint px-3 py-1 text-xs text-text-soft"
              >
                {name}
              </li>
            ))}
          </ul>

          <form action={create} className="mt-5 space-y-4">
            <label className="flex items-center gap-2 text-sm text-text-soft">
              <input
                type="checkbox"
                name="create_account"
                defaultChecked
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Criar também a conta “Caixa da empresa”
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando…" : "Criar padrões"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={dismiss}
              >
                Agora não
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
