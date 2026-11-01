"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const pages = [
  { title: "Dashboard", url: "/dashboard" },
  { title: "Transações", url: "/transacoes" },
  { title: "Contas", url: "/contas" },
  { title: "Cartões", url: "/cartoes" },
  { title: "Categorias", url: "/categorias" },
  { title: "Relatórios", url: "/relatorios" },
  { title: "Metas", url: "/metas" },
  { title: "Investimentos", url: "/investimentos" },
  { title: "Configurações", url: "/configuracoes" },
];

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
};

export function SiteHeader({ userName, avatarUrl, aiConfigured }: SiteHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/[0.06] bg-background/80 px-4 backdrop-blur-xl lg:px-8">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/logos/forge-logo.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-xl ring-1 ring-brand/40 md:hidden"
          />
          <span className="text-lg font-semibold tracking-tight text-white">
            Forge <span className="text-brand-soft">Finance</span>
          </span>
        </Link>

        <div
          className={cn(
            "ml-2 hidden items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] lg:flex",
            aiConfigured
              ? "border-brand-bright/30 bg-brand/10 text-brand-soft"
              : "border-white/10 bg-white/[0.03] text-zinc-400"
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
              aiConfigured ? "bg-brand-bright shadow-[0_0_8px_#a855f7]" : "bg-zinc-600"
            )}
          />
          {aiConfigured ? "IA: chave configurada" : "IA: não configurada"}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden sm:block">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
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
            className="h-10 w-56 rounded-full border border-white/10 bg-surface pl-10 pr-4 text-sm text-white outline-none transition focus:border-brand-bright/50 focus:ring-2 focus:ring-brand-bright/20 lg:w-72"
          />

          {open && query.trim() && (
            <ul className="absolute right-0 top-12 w-full overflow-hidden rounded-2xl border border-white/10 bg-surface p-1 shadow-2xl">
              {results.length === 0 ? (
                <li className="px-3 py-2 text-sm text-zinc-500">
                  Nenhuma página encontrada
                </li>
              ) : (
                results.map((page) => (
                  <li key={page.url}>
                    <button
                      type="button"
                      onMouseDown={() => go(page.url)}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm text-zinc-200 transition hover:bg-accent"
                    >
                      {page.title}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        <Link
          href="/configuracoes"
          aria-label="Configurações"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface text-zinc-300 transition hover:border-brand-bright/40 hover:text-brand-soft"
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
