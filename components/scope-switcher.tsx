"use client";

import { useOptimistic, useTransition } from "react";
import { Building2Icon, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { setActiveScope } from "@/app/actions/scope";
import { SCOPE_LABEL, type Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";

const options = [
  { value: "personal", icon: UserIcon },
  { value: "business", icon: Building2Icon },
] as const;

type ScopeSwitcherProps = {
  scope: Scope;
  /** "vertical" para a barra lateral; "horizontal" para o cabeçalho no celular. */
  orientation?: "vertical" | "horizontal";
  className?: string;
};

/** Seletor "Pessoal | Empresa". O escopo fica salvo em cookie. */
export function ScopeSwitcher({
  scope,
  orientation = "horizontal",
  className,
}: ScopeSwitcherProps) {
  const [optimisticScope, setOptimisticScope] = useOptimistic(scope);
  const [isPending, startTransition] = useTransition();
  const vertical = orientation === "vertical";

  function choose(next: Scope) {
    if (next === optimisticScope) return;

    startTransition(async () => {
      setOptimisticScope(next);

      try {
        await setActiveScope(next);
      } catch {
        toast.error("Não foi possível trocar o escopo. Tente de novo.");
      }
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Escopo dos dados"
      aria-busy={isPending}
      className={cn(
        "glass flex gap-1 rounded-2xl p-1",
        vertical ? "flex-col" : "flex-row",
        isPending && "opacity-80",
        className
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = optimisticScope === option.value;
        const label = SCOPE_LABEL[option.value];

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(option.value)}
            className={cn(
              "flex items-center justify-center rounded-xl border transition-all duration-300 outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand-bright/70",
              vertical ? "h-12 w-12 flex-col gap-0.5" : "h-8 gap-1.5 px-2.5",
              active
                ? "glass-active text-brand-soft"
                : "border-transparent text-faint hover:bg-tint-strong hover:text-text-soft"
            )}
          >
            <Icon className={vertical ? "h-4 w-4" : "h-4 w-4 shrink-0"} />
            <span
              className={cn(
                "font-semibold",
                vertical ? "text-[9px] leading-none" : "text-xs",
                !vertical && !active && "sr-only"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
