"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BriefcaseIcon,
  LayoutDashboardIcon,
  ListIcon,
  Settings2Icon,
  SparklesIcon,
  TargetIcon,
  WalletCardsIcon,
} from "lucide-react";

import { ScopeSwitcher } from "@/components/scope-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";

export type NavLink = {
  title: string;
  url: string;
  /** Página que pertence ao grupo, mas não ganha sub-aba própria. */
  hidden?: boolean;
};

export type NavGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** O primeiro item é a página aberta ao clicar no ícone. */
  items: NavLink[];
};

const dashboard: NavGroup = {
  title: "Dashboard",
  icon: LayoutDashboardIcon,
  items: [{ title: "Dashboard", url: "/dashboard" }],
};

/** Só no escopo Empresa, logo depois do Dashboard. */
const business: NavGroup = {
  title: "Empresa",
  icon: BriefcaseIcon,
  items: [
    { title: "Gestão", url: "/gestao" },
    { title: "Clientes", url: "/clientes" },
    { title: "Impostos (MEI)", url: "/impostos" },
  ],
};

const entries: NavGroup = {
  title: "Lançamentos",
  icon: ListIcon,
  items: [
    { title: "Transações", url: "/transacoes" },
    { title: "A pagar e receber", url: "/contas-a-pagar-receber" },
    { title: "Importar extrato", url: "/importar" },
    { title: "Categorias", url: "/categorias" },
  ],
};

const wallet: NavGroup = {
  title: "Contas e cartões",
  icon: WalletCardsIcon,
  items: [
    { title: "Contas", url: "/contas" },
    { title: "Cartões", url: "/cartoes" },
    { title: "Investimentos", url: "/investimentos" },
  ],
};

const planning: NavGroup = {
  title: "Metas e relatórios",
  icon: TargetIcon,
  items: [
    { title: "Metas", url: "/metas" },
    { title: "Relatórios", url: "/relatorios" },
  ],
};

const assistant: NavGroup = {
  title: "Assistente IA",
  icon: SparklesIcon,
  items: [{ title: "Assistente IA", url: "/assistente" }],
};

export const settingsGroup: NavGroup = {
  title: "Configurações",
  icon: Settings2Icon,
  items: [
    { title: "Configurações", url: "/configuracoes" },
    { title: "WhatsApp", url: "/whatsapp" },
    { title: "Planos", url: "/planos" },
    { title: "Assinatura", url: "/assinatura", hidden: true },
  ],
};

export function getNavGroups(scope: Scope): NavGroup[] {
  return scope === "business"
    ? [dashboard, business, entries, wallet, planning, assistant]
    : [dashboard, entries, wallet, planning, assistant];
}

/** Todas as páginas (para a busca "Ir para uma página"). */
export function getAllPages(scope: Scope): NavLink[] {
  return [...getNavGroups(scope), settingsGroup].flatMap((group) =>
    group.items.filter((item) => !item.hidden)
  );
}

export function isActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function findGroup(scope: Scope, pathname: string) {
  return [...getNavGroups(scope), settingsGroup].find((group) =>
    group.items.some((item) => isActive(pathname, item.url))
  );
}

/* ------------------------------- tooltip ------------------------------- */

type TipState = { top: number; left: number } | null;

/**
 * Nome da aba ao passar o mouse (ou focar pelo teclado). Usa posição fixa
 * para não ser cortado pela rolagem da barra lateral.
 */
function useRailTooltip() {
  const [tip, setTip] = useState<TipState>(null);

  const show = useCallback((event: React.SyntheticEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTip({ top: rect.top + rect.height / 2, left: rect.right + 12 });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  return { tip, show, hide };
}

function RailTooltip({ tip, group }: { tip: TipState; group: NavGroup }) {
  if (!tip) return null;
  const subpages = group.items.filter((item) => !item.hidden);

  return (
    <span
      role="tooltip"
      style={{ top: tip.top, left: tip.left }}
      className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-xl border border-line bg-surface-solid px-3 py-2 text-left shadow-xl"
    >
      <span className="block text-sm font-semibold text-foreground">{group.title}</span>
      {subpages.length > 1 && (
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {subpages.map((item) => item.title).join(" · ")}
        </span>
      )}
    </span>
  );
}

function RailItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const Icon = group.icon;
  const active = group.items.some((item) => isActive(pathname, item.url));
  const { tip, show, hide } = useRailTooltip();

  return (
    <li className="relative">
      <Link
        href={group.items[0].url}
        aria-label={group.title}
        aria-current={active ? "page" : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={hide}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand-bright/70",
          active
            ? "border-brand-bright/40 bg-brand/15 text-brand-soft shadow-[0_0_22px_rgba(168,85,247,0.45),inset_0_0_12px_rgba(168,85,247,0.2)]"
            : "border-transparent text-faint hover:bg-tint-strong hover:text-text-soft"
        )}
      >
        {active && (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-2 -z-10 rounded-full bg-brand/30 blur-xl"
          />
        )}
        <Icon
          className={cn(
            "h-5 w-5 transition-all duration-300",
            active && "drop-shadow-[0_0_8px_rgba(192,132,252,0.9)]"
          )}
        />
      </Link>

      <RailTooltip tip={tip} group={group} />
    </li>
  );
}

/** Barra lateral compacta (desktop): um ícone por grupo. */
export function AppSidebar({ scope }: { scope: Scope }) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navegação principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center border-r border-line bg-sidebar py-5 backdrop-blur-xl md:flex"
    >
      <Link
        href="/dashboard"
        aria-label="Forge Finance"
        className="mb-4 flex h-12 w-12 items-center justify-center transition-transform duration-300 hover:scale-105"
      >
        <Image
          src="/icon-f.png"
          alt="Forge Finance"
          width={48}
          height={48}
          priority
          className="h-12 w-12 object-contain drop-shadow-[0_0_14px_rgba(139,92,246,0.45)]"
        />
      </Link>

      <ScopeSwitcher scope={scope} orientation="vertical" className="mb-4" />

      <nav className="flex w-full flex-1 flex-col items-center overflow-y-auto py-1">
        <ul className="flex flex-col items-center gap-2 rounded-[28px] border border-line bg-tint p-2">
          {getNavGroups(scope).map((group) => (
            <RailItem key={group.title} group={group} pathname={pathname} />
          ))}
        </ul>
      </nav>

      <ul className="mt-3 flex flex-col items-center gap-3">
        <li>
          <ThemeToggle placement="right" />
        </li>
        <RailItem group={settingsGroup} pathname={pathname} />
      </ul>
    </aside>
  );
}

/** Navegação móvel: barra inferior com um ícone por grupo e o nome embaixo. */
export function MobileNav({ scope }: { scope: Scope }) {
  const pathname = usePathname();
  const groups = [...getNavGroups(scope), settingsGroup];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="flex items-stretch justify-between gap-1 overflow-x-auto px-2 py-1.5">
        {groups.map((group) => {
          const Icon = group.icon;
          const active = group.items.some((item) => isActive(pathname, item.url));
          const short = group.title.split(" ")[0];

          return (
            <li key={group.title} className="min-w-[56px] flex-1">
              <Link
                href={group.items[0].url}
                aria-label={group.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl border px-1 py-1.5 text-[10px] font-medium transition-all duration-300",
                  active
                    ? "border-brand-bright/40 bg-brand/15 text-brand-soft"
                    : "border-transparent text-faint"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate">{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
