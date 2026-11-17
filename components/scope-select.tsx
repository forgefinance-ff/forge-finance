"use client";

import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Building2Icon, CheckIcon, ChevronsUpDownIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";

import { setActiveScope } from "@/app/actions/scope";
import { SCOPE_LABEL, type Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";

const options: { value: Scope; icon: typeof UserIcon; hint: string }[] = [
  { value: "business", icon: Building2Icon, hint: "Seu MEI" },
  { value: "personal", icon: UserIcon, hint: "Seu dinheiro" },
];

type ScopeSelectProps = {
  scope: Scope;
  /** Só o ícone (barra lateral recolhida). */
  compact?: boolean;
  className?: string;
};

/**
 * Seletor "Empresa | Pessoal" no topo da barra lateral: mostra onde a pessoa
 * está e abre um menu para trocar. O escopo fica salvo em cookie.
 */
export function ScopeSelect({ scope, compact = false, className }: ScopeSelectProps) {
  const [optimisticScope, setOptimisticScope] = useOptimistic(scope);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const current = options.find((option) => option.value === optimisticScope) ?? options[0];
  const CurrentIcon = current.icon;

  // Fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: Scope) {
    setOpen(false);
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
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Escopo: ${SCOPE_LABEL[current.value]}. Trocar`}
        title={compact ? `${SCOPE_LABEL[current.value]} — trocar` : undefined}
        aria-busy={isPending}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl border border-line bg-surface-elevated text-left outline-none transition-colors",
          "hover:border-line-strong focus-visible:ring-2 focus-visible:ring-brand",
          compact ? "mx-auto h-10 w-10 justify-center" : "px-3 py-3",
          isPending && "opacity-70"
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground",
            compact ? "h-7 w-7" : "h-8 w-8"
          )}
        >
          <CurrentIcon className="h-4 w-4" />
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{SCOPE_LABEL[current.value]}</span>
              <span className="block truncate text-xs text-faint">{current.hint}</span>
            </span>
            <ChevronsUpDownIcon aria-hidden className="h-4 w-4 shrink-0 text-faint" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Trocar escopo"
          className={cn(
            "absolute z-50 rounded-xl border border-line bg-surface-solid p-1 shadow-[var(--shadow-panel)]",
            compact ? "left-full top-0 ml-3 w-56" : "inset-x-0 top-full mt-1.5"
          )}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const active = option.value === optimisticScope;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(option.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition-colors",
                  "hover:bg-tint-strong focus-visible:bg-tint-strong",
                  active && "bg-tint"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-text-soft" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{SCOPE_LABEL[option.value]}</span>
                  <span className="block text-xs text-faint">{option.hint}</span>
                </span>
                {active && <CheckIcon className="h-4 w-4 shrink-0 text-brand" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
