"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Claro", icon: SunIcon },
  { value: "dark", label: "Escuro", icon: MoonIcon },
  { value: "system", label: "Sistema", icon: MonitorIcon },
] as const;

const subscribe = () => () => {};

type ThemeToggleProps = {
  /** "bottom" abre o menu abaixo (cabeçalho); "right" abre ao lado (barra lateral). */
  placement?: "bottom" | "right";
  className?: string;
};

export function ThemeToggle({ placement = "bottom", className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // O tema só é conhecido no cliente; evita divergência de hidratação no ícone.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
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

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const current = mounted ? theme : undefined;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Alternar tema"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-text-soft transition hover:border-brand-bright/40 hover:text-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60"
      >
        {isDark ? (
          <MoonIcon className="h-[18px] w-[18px]" />
        ) : (
          <SunIcon className="h-[18px] w-[18px]" />
        )}
      </button>

      {open && (
        <ul
          role="menu"
          aria-label="Tema"
          className={cn(
            "absolute z-50 w-40 overflow-hidden rounded-2xl border border-line bg-surface-solid p-1 shadow-2xl",
            placement === "bottom" ? "right-0 top-12" : "bottom-0 left-full ml-3"
          )}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const selected = current === option.value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition",
                    selected
                      ? "bg-accent text-accent-foreground"
                      : "text-text-soft hover:bg-tint-strong"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{option.label}</span>
                  {selected && <CheckIcon className="h-4 w-4" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
