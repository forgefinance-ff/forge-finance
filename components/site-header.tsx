"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, SearchIcon, Settings, ShieldCheck } from "lucide-react";

import { getAllPages } from "@/components/app-sidebar";
import { ScopeSwitcher } from "@/components/scope-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Scope } from "@/lib/scope";


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
  /** Só vem true para os e-mails de ADMIN_EMAILS (checado no servidor). */
  isAdmin?: boolean;
};

export function SiteHeader({ userName, avatarUrl, scope, isAdmin = false }: SiteHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const pages = getAllPages(scope).map(({ title, url }) => ({ title, url }));

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 bg-background/95 px-4 backdrop-blur-md sm:h-20 lg:px-8">
      <Link href="/dashboard" className="flex items-center gap-2.5 md:hidden">
        <Image
          src="/icon-f.png"
          alt=""
          width={32}
          height={32}
          priority
          className="h-8 w-8 object-contain"
        />
        <span className="brand-wordmark hidden text-xl text-foreground min-[420px]:inline">
          forge finance
        </span>
      </Link>

      <div className="relative hidden sm:block">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
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
          className="glass h-11 w-64 rounded-full pl-11 pr-4 text-sm text-foreground placeholder:text-faint outline-none transition-[border-color,box-shadow] focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 lg:w-96"
        />

        {open && query.trim() && (
          <ul className="absolute left-0 top-13 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface-solid p-1 shadow-[var(--shadow-panel)]">
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-faint">Nenhuma página encontrada</li>
            ) : (
              results.map((page) => (
                <li key={page.url}>
                  <button
                    type="button"
                    onMouseDown={() => go(page.url)}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-text-soft transition-colors hover:bg-accent"
                  >
                    {page.title}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ScopeSwitcher scope={scope} className="md:hidden" />

        <ThemeToggle />

        <Link
          href="/whatsapp"
          className="hidden h-11 items-center gap-2 rounded-full bg-success px-5 text-sm font-semibold text-white dark:text-background transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success sm:flex"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          No WhatsApp
        </Link>

        <Link
          href="/whatsapp"
          aria-label="No WhatsApp"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-white dark:text-background sm:hidden"
        >
          <MessageCircle className="h-[18px] w-[18px]" aria-hidden />
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            aria-label="Painel admin"
            title="Painel admin"
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-text-soft transition-colors hover:text-foreground"
          >
            <ShieldCheck className="h-[18px] w-[18px]" aria-hidden />
          </Link>
        )}

        <Link
          href="/configuracoes"
          aria-label="Configurações"
          className="glass hidden h-10 w-10 items-center justify-center rounded-full text-text-soft transition-colors hover:text-foreground sm:flex md:hidden"
        >
          <Settings className="h-[18px] w-[18px]" />
        </Link>

        <Link
          href="/configuracoes"
          aria-label={`Perfil de ${userName}`}
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-accent-foreground md:hidden"
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
