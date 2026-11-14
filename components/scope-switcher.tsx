"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Building2Icon, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { setActiveScope } from "@/app/actions/scope";
import { SCOPE_LABEL, type Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { TabsPill, useSlidingPill } from "@/components/motion";

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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const vertical = orientation === "vertical";
  const { containerRef, pillRef } = useSlidingPill<HTMLDivElement>(optimisticScope);

  function choose(next: Scope) {
    if (next === optimisticScope) return;

    startTransition(async () => {
      setOptimisticScope(next);

      try {
        const result = await setActiveScope(next);
        if (!result.ok) {
          toast("Pessoal + Empresa é do Forge Pro.", {
            action: { label: "Ver planos", onClick: () => router.push("/assinar") },
          });
        }
      } catch {
        toast.error("Não foi possível trocar o escopo. Tente de novo.");
      }
    });
  }

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Escopo dos dados"
      aria-busy={isPending}
      className={cn(
        "glass relative flex gap-1 rounded-full p-1.5",
        vertical ? "flex-col" : "flex-row",
        isPending && "opacity-80",
        className
      )}
    >
      <TabsPill pillRef={pillRef} />
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
            data-active={active}
            aria-label={label}
            title={label}
            onClick={() => choose(option.value)}
            className={cn(
              "t-tab flex items-center justify-center rounded-full outline-none",
              "focus-visible:ring-2 focus-visible:ring-brand",
              vertical ? "h-10 w-10" : "h-8 gap-1.5 px-3",
              active
                ? "text-background"
                : "text-faint hover:text-foreground"
            )}
          >
            <Icon className={vertical ? "h-4 w-4" : "h-4 w-4 shrink-0"} />
            <span
              className={cn(
                "font-semibold",
                vertical ? "sr-only" : "text-xs",
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
