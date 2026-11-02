"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon, Settings } from "lucide-react";

import { getNavItems } from "@/components/app-sidebar";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";


function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type SiteHeaderProps = {
  userName: string;
  avatarUrl: string | null;
  aiConfigured: boolean;
  scope: Scope;
};

export function SiteHeader({ userName, avatarUrl, aiConfigured, scope }: SiteHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const pages = [
    ...getNavItems(scope).map(({ title, url }) => ({ title, url })),
    { title: "Configurações", url: "/configuracoes" },
  ];

  const results = query.trim()
    ? pages.filter((p) => normalize(p.title).includes(normalize(query.trim())))
    : [];

  function go(url: string) {
    setQuery("");
    setOpen(false);
    router.push(url);
  }

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-background/70 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/icon-f.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(139,92,246,0.45)] md:hidden"
          />
          <span className="hidden text-lg font-semibold tracking-tight text-foreground min-[420px]:inline">
            Forge <span className="text-brand-soft">Finance</span>
          </span>
        </Link>

        <div
          className={cn(
            "ml-2 hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] lg:flex",
            aiConfigured
              ? "border-brand-bright/30 bg-brand/10 text-brand-soft"
              : "border-line bg-tint text-muted-foreground"
          )}
          title={
            aiConfigured
              ? "Chave do provedor de IA configurada no servidor."
              : "Defina ANTHROPIC_API_KEY no servidor para ativar a IA."
          }
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              aiConfigured ? "bg-brand-bright shadow-[0_0_8px_#a855f7]" : "bg-faint"
            )}
          />
          {aiConfigured ? "IA: chave configurada" : "IA: não configurada"}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ScopeSwitcher scope={scope} className="md:hidden" />

        <div className="relative hidden sm:block">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) go(results[0].url);
              if (e.key === "Escape") setOpen(false);
            }}
            aria-label="Ir para uma página"
            placeholder="Ir para uma página…"
            className="h-10 w-56 rounded-full border border-line bg-surface pl-10 pr-4 text-sm text-foreground placeholder:text-faint outline-none transition focus:border-brand-bright/50 focus:ring-2 focus:ring-brand-bright/20 lg:w-72"
          />

          {open && query.trim() && (
            <ul className="absolute right-0 top-12 w-full overflow-hidden rounded-2xl border border-line bg-surface-solid p-1 shadow-2xl">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-faint">
                  Nenhuma página encontrada
                </li>
              ) : (
                results.map((page) => (
                  <li key={page.url}>
                    <button
                      type="button"
                      onMouseDown={() => go(page.url)}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-soft transition hover:bg-accent"
                    >
                      {page.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <ThemeToggle />

        <Link
          href="/configuracoes"
          aria-label="Configurações"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-text-soft transition hover:border-brand-bright/40 hover:text-brand-soft"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        <Link
          href="/configuracoes"
          aria-label={`Perfil de ${userName}`}
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-indigo text-sm font-semibold text-white ring-2 ring-brand/30"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials || "FF"
          )}
        </Link>
      </div>
    </header>
  );
}
