"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BriefcaseIcon,
  LayoutDashboardIcon,
  ListIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Settings2Icon,
  SparklesIcon,
  TargetIcon,
  WalletCardsIcon,
} from "lucide-react";

import { TabsPill, useOptimisticPath, useSlidingPill } from "@/components/motion";
import { ScopeSwitcher } from "@/components/scope-switcher";
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
    { title: "Orçamentos", url: "/orcamentos" },
    { title: "Relatórios", url: "/relatorios" },
    { title: "Raio-X", url: "/raio-x" },
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
    { title: "Primeiros passos", url: "/comecar" },
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

/* -------------------------------- badges -------------------------------- */

export type NavBadge = { count: number; tone: "danger" | "brand"; label: string };
/** Avisos por página (chave = url), somados no ícone do grupo. */
export type NavBadges = Record<string, NavBadge | undefined>;

export function groupBadge(group: NavGroup, badges: NavBadges): NavBadge | undefined {
  const list = group.items.map((item) => badges[item.url]).filter(Boolean) as NavBadge[];
  if (list.length === 0) return undefined;
  return {
    count: list.reduce((sum, b) => sum + b.count, 0),
    tone: list.some((b) => b.tone === "danger") ? "danger" : "brand",
    label: list.map((b) => b.label).join(" · "),
  };
}

export function BadgeCount({
  badge,
  floating = false,
  className,
}: {
  badge: NavBadge;
  floating?: boolean;
  className?: string;
}) {
  return (
    <span
      title={badge.label}
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums leading-none",
        badge.tone === "danger" ? "bg-danger text-white" : "bg-brand text-white",
        floating && "absolute -right-0.5 -top-0.5 ring-2 ring-surface-solid",
        className
      )}
    >
      <span aria-hidden>{badge.count > 9 ? "9+" : badge.count}</span>
      <span className="sr-only">{badge.label}</span>
    </span>
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

function RailTooltip({ tip, group, badge }: { tip: TipState; group: NavGroup; badge?: NavBadge }) {
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
      {badge && (
        <span className={cn("mt-1 block text-xs font-medium", badge.tone === "danger" ? "text-danger" : "text-brand")}>
          {badge.label}
        </span>
      )}
    </span>
  );
}

function RailItem({
  group,
  pathname,
  open,
  badge,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  badge?: NavBadge;
  onNavigate: (url: string) => void;
}) {
  const Icon = group.icon;
  const active = group.items.some((item) => isActive(pathname, item.url));
  const { tip, show, hide } = useRailTooltip();
  // Com a barra aberta (telas largas) o nome já aparece; o balão só vale fechada.
  const tipHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (!open || window.innerWidth < 1280) show(e);
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (!open || window.innerWidth < 1280) show(e);
    },
    onMouseLeave: hide,
    onBlur: hide,
    onClick: () => {
      hide();
      onNavigate(group.items[0].url);
    },
  };

  return (
    <li>
      <Link
        href={group.items[0].url}
        aria-label={group.title}
        aria-current={active ? "page" : undefined}
        data-active={active}
        {...tipHandlers}
        className={cn(
          "t-tab relative flex h-10 w-10 items-center justify-center gap-3 rounded-full text-sm font-medium outline-none",
          "focus-visible:ring-2 focus-visible:ring-brand",
          open && "xl:w-full xl:justify-start xl:px-3",
          active ? "text-accent-foreground" : "text-faint hover:bg-tint-strong hover:text-foreground"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {open && <span className="hidden flex-1 truncate xl:inline">{group.title}</span>}
        {badge && (
          <>
            <BadgeCount badge={badge} floating className={cn(open && "xl:hidden")} />
            {open && <BadgeCount badge={badge} className="hidden xl:inline-flex" />}
          </>
        )}
      </Link>

      <RailTooltip tip={tip} group={group} badge={badge} />
    </li>
  );
}

export const RAIL_COOKIE = "forge_rail";

/**
 * Barra lateral (desktop): pílula flutuante. Em telas largas (xl) pode abrir
 * com os nomes das abas; a escolha fica salva em cookie. A aba ativa é
 * marcada por uma pílula que estica ao trocar de página.
 */
export function AppSidebar({
  scope,
  badges = {},
  initialOpen = true,
}: {
  scope: Scope;
  badges?: NavBadges;
  initialOpen?: boolean;
}) {
  const [current, setCurrent] = useOptimisticPath(usePathname());
  const [open, setOpen] = useState(initialOpen);
  const { containerRef, pillRef } = useSlidingPill<HTMLElement>(`${current}|${open}|${scope}`);
  const groups = getNavGroups(scope);

  function toggle() {
    const next = !open;
    setOpen(next);
    document.cookie = `${RAIL_COOKIE}=${next ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
  }

  const ToggleIcon = open ? PanelLeftCloseIcon : PanelLeftOpenIcon;

  return (
    <aside
      aria-label="Navegação principal"
      data-rail={open ? "open" : "closed"}
      className={cn(
        "fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex",
        open && "xl:w-56 xl:items-stretch"
      )}
    >
      {open ? (
        <>
          <ScopeSwitcher scope={scope} orientation="vertical" className="self-center xl:hidden" />
          <ScopeSwitcher scope={scope} orientation="horizontal" className="hidden justify-between xl:flex [&>button]:flex-1" />
        </>
      ) : (
        <ScopeSwitcher scope={scope} orientation="vertical" />
      )}

      <nav
        ref={containerRef}
        className={cn(
          "glass relative flex flex-col items-center gap-1 rounded-[28px] p-1.5",
          open && "xl:items-stretch"
        )}
      >
        <TabsPill pillRef={pillRef} className="bg-accent" />

        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Recolher menu" : "Abrir menu com nomes"}
          title={open ? "Recolher menu" : "Abrir menu com nomes"}
          aria-expanded={open}
          className={cn(
            "relative z-[1] hidden h-9 w-10 items-center justify-center rounded-full text-faint outline-none transition-colors hover:bg-tint-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand xl:flex",
            open && "xl:w-full xl:justify-start xl:gap-3 xl:px-3"
          )}
        >
          <ToggleIcon className="h-[18px] w-[18px] shrink-0" />
          {open && <span className="hidden text-xs font-medium xl:inline">Recolher</span>}
        </button>

        <ul className={cn("flex flex-col items-center gap-1", open && "xl:items-stretch")}>
          {groups.map((group) => (
            <RailItem
              key={group.title}
              group={group}
              pathname={current}
              open={open}
              badge={groupBadge(group, badges)}
              onNavigate={setCurrent}
            />
          ))}
        </ul>
        <span aria-hidden className="my-1 h-px w-6 self-center bg-line" />
        <ul className={cn("flex flex-col items-center gap-1", open && "xl:items-stretch")}>
          <RailItem
            group={settingsGroup}
            pathname={current}
            open={open}
            badge={groupBadge(settingsGroup, badges)}
            onNavigate={setCurrent}
          />
        </ul>
      </nav>
    </aside>
  );
}

/** Navegação móvel: barra inferior com um ícone por grupo e o nome embaixo. */
export function MobileNav({ scope, badges = {} }: { scope: Scope; badges?: NavBadges }) {
  const pathname = usePathname();
  const groups = [...getNavGroups(scope), settingsGroup];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-solid pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch justify-between gap-1 overflow-x-auto px-2 py-1.5">
        {groups.map((group) => {
          const Icon = group.icon;
          const active = group.items.some((item) => isActive(pathname, item.url));
          const short =
            ({
              Dashboard: "Início",
              Lançamentos: "Extrato",
              "Contas e cartões": "Contas",
              "Metas e relatórios": "Metas",
              "Assistente IA": "IA",
              Configurações: "Ajustes",
            } as Record<string, string>)[group.title] ?? group.title.split(" ")[0];

          return (
            <li key={group.title} className="min-w-[56px] flex-1">
              <Link
                href={group.items[0].url}
                aria-label={group.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-medium transition-colors duration-150",
                  active ? "bg-accent text-accent-foreground" : "text-faint"
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" />
                  {groupBadge(group, badges) && (
                    <BadgeCount badge={groupBadge(group, badges)!} floating className="-right-2.5 -top-1.5" />
                  )}
                </span>
                <span className="max-w-full truncate">{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
