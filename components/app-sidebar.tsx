"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseIcon,
  ChevronDownIcon,
  CrownIcon,
  LayoutDashboardIcon,
  ListIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  Settings2Icon,
  SparklesIcon,
  TargetIcon,
  WalletCardsIcon,
} from "lucide-react";

import { useOptimisticPath } from "@/components/motion";
import { ScopeSelect } from "@/components/scope-select";
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
    { title: "Resumo do mês", url: "/resumo" },
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
 * Nome da aba ao passar o mouse (ou focar pelo teclado) com a barra fechada.
 * Usa posição fixa para não ser cortado pela rolagem da barra.
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

/** Classes de um item folha (página): ativo ganha bloco de cor cheia. */
function leafClass(active: boolean) {
  return cn(
    "flex w-full items-center gap-3.5 rounded-xl text-[15px] outline-none transition-colors duration-150",
    "focus-visible:ring-2 focus-visible:ring-brand",
    active
      ? "bg-brand font-semibold text-background shadow-sm"
      : "font-medium text-text-soft hover:bg-tint-strong hover:text-foreground"
  );
}

/** Barra fechada (ou telas médias): só o ícone do grupo, com balão do nome. */
function CompactItem({
  group,
  pathname,
  badge,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  badge?: NavBadge;
  onNavigate: (url: string) => void;
}) {
  const Icon = group.icon;
  const active = group.items.some((item) => isActive(pathname, item.url));
  const { tip, show, hide } = useRailTooltip();

  return (
    <li className="flex justify-center">
      <Link
        href={group.items[0].url}
        aria-label={group.title}
        aria-current={active ? "page" : undefined}
        onMouseEnter={show}
        onFocus={show}
        onMouseLeave={hide}
        onBlur={hide}
        onClick={() => {
          hide();
          onNavigate(group.items[0].url);
        }}
        className={cn(leafClass(active), "relative h-10 w-10 justify-center")}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {badge && <BadgeCount badge={badge} floating />}
      </Link>
      <RailTooltip tip={tip} group={group} badge={badge} />
    </li>
  );
}

/** Barra aberta: grupo com uma página vira link; com várias, abre e fecha. */
function ExpandedItem({
  group,
  pathname,
  badges,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  badges: NavBadges;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (url: string) => void;
}) {
  const Icon = group.icon;
  const pages = group.items.filter((item) => !item.hidden);
  const containsActive = group.items.some((item) => isActive(pathname, item.url));
  const badge = groupBadge(group, badges);

  if (pages.length <= 1) {
    const url = group.items[0].url;
    return (
      <li>
        <Link
          href={url}
          aria-current={containsActive ? "page" : undefined}
          onClick={() => onNavigate(url)}
          className={cn(leafClass(containsActive), "h-12 px-3.5")}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="flex-1 truncate">{group.title}</span>
          {badge && <BadgeCount badge={badge} />}
        </Link>
      </li>
    );
  }

  const listId = `nav-${group.title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={listId}
        className={cn(
          "flex h-12 w-full items-center gap-3.5 rounded-xl px-3.5 text-[15px] outline-none transition-colors duration-150",
          "hover:bg-tint-strong focus-visible:ring-2 focus-visible:ring-brand",
          containsActive ? "font-semibold text-foreground" : "font-medium text-text-soft hover:text-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", containsActive && "text-brand")} />
        <span className="flex-1 truncate text-left">{group.title}</span>
        {!expanded && badge && <BadgeCount badge={badge} />}
        <ChevronDownIcon
          aria-hidden
          className={cn("h-4 w-4 shrink-0 text-faint transition-transform duration-200", expanded && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <ul id={listId} className="ml-[1.55rem] overflow-hidden border-l border-line pl-2.5" inert={!expanded}>
          {pages.map((item, index) => {
            const active = isActive(pathname, item.url);
            const itemBadge = badges[item.url];
            return (
              <li key={item.url} className={cn(index === 0 && "pt-1", index === pages.length - 1 && "pb-1")}>
                <Link
                  href={item.url}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.url)}
                  className={cn(leafClass(active), "h-10 px-3")}
                >
                  <span className="flex-1 truncate">{item.title}</span>
                  {itemBadge && <BadgeCount badge={itemBadge} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

/* ------------------------------ plano ------------------------------ */

export type SidebarPlan =
  | { kind: "pro" }
  | { kind: "trial"; daysLeft: number }
  | { kind: "free" };

const TRIAL_DAYS = 30;

/** Cartão do plano no rodapé da barra (só com a barra aberta). */
function PlanCard({ plan }: { plan: SidebarPlan }) {
  if (plan.kind === "pro") {
    return (
      <Link
        href="/assinatura"
        className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-medium text-text-soft outline-none transition-colors hover:border-line-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand"
      >
        <CrownIcon aria-hidden className="h-4 w-4 text-brand" />
        <span className="flex-1">Forge Pro ativo</span>
      </Link>
    );
  }

  if (plan.kind === "trial") {
    // Regra de três: 30 dias estão para 100% assim como os dias usados estão para X.
    const used = Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - plan.daysLeft));
    const percent = Math.round((used * 100) / TRIAL_DAYS);
    return (
      <div className="rounded-xl border border-line bg-surface-elevated p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <SparklesIcon aria-hidden className="h-3.5 w-3.5 text-brand" />
          Teste grátis do Pro
        </p>
        <p className="mt-0.5 text-xs text-faint">
          {plan.daysLeft === 1 ? "Falta 1 dia" : `Faltam ${plan.daysLeft} dias`}
        </p>
        <div
          role="progressbar"
          aria-label="Dias de teste usados"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint-strong"
        >
          <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
        </div>
        <Link
          href="/planos"
          className="mt-2.5 flex h-8 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-background outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Ver planos
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-elevated p-3">
      <p className="text-xs font-semibold text-foreground">Plano grátis</p>
      <p className="mt-0.5 text-xs text-faint">WhatsApp e IA ficam no Pro.</p>
      <Link
        href="/planos"
        className="mt-2.5 flex h-8 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-background outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Conhecer o Pro
      </Link>
    </div>
  );
}

export const RAIL_COOKIE = "forge_rail";
const GROUPS_KEY = "forge_nav_groups";

function initialsOf(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FF"
  );
}

/**
 * Barra lateral (desktop), presa à esquerda em toda a altura. Em telas largas
 * (xl) pode abrir com os nomes e os subgrupos; a escolha fica salva em cookie.
 * Em telas médias fica sempre só com os ícones.
 */
export function AppSidebar({
  scope,
  badges = {},
  initialOpen = true,
  userName,
  avatarUrl = null,
  plan,
}: {
  scope: Scope;
  badges?: NavBadges;
  initialOpen?: boolean;
  userName: string;
  avatarUrl?: string | null;
  plan?: SidebarPlan;
}) {
  const [current, setCurrent] = useOptimisticPath(usePathname());
  const [open, setOpen] = useState(initialOpen);
  const groups = getNavGroups(scope);
  // Só o grupo da página atual começa aberto; o que a pessoa abrir ou
  // fechar fica salvo neste navegador.
  const [manual, setManual] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(GROUPS_KEY);
      // Lê depois de montar para não divergir do HTML do servidor.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setManual(JSON.parse(saved) as Record<string, boolean>);
    } catch {
      // Sem armazenamento: segue com todos abertos.
    }
  }, []);

  function toggle() {
    const next = !open;
    setOpen(next);
    document.cookie = `${RAIL_COOKIE}=${next ? "open" : "closed"}; path=/; max-age=31536000; samesite=lax`;
  }

  function isExpanded(group: NavGroup) {
    // Configurações começa fechado, a não ser que a página atual esteja nele.
    const containsActive = group.items.some((item) => isActive(current, item.url));
    return manual[group.title] ?? containsActive;
  }

  function toggleGroup(group: NavGroup) {
    const next = { ...manual, [group.title]: !isExpanded(group) };
    setManual(next);
    try {
      window.localStorage.setItem(GROUPS_KEY, JSON.stringify(next));
    } catch {
      // Sem armazenamento: vale só nesta visita.
    }
  }

  const ToggleIcon = open ? PanelLeftCloseIcon : PanelLeftOpenIcon;

  /** Lista em uma das duas formas: aberta (xl) ou só ícones. */
  function renderList(list: NavGroup[], expandedMode: boolean) {
    return list.map((group) =>
      expandedMode ? (
        <ExpandedItem
          key={group.title}
          group={group}
          pathname={current}
          badges={badges}
          expanded={isExpanded(group)}
          onToggle={() => toggleGroup(group)}
          onNavigate={setCurrent}
        />
      ) : (
        <CompactItem
          key={group.title}
          group={group}
          pathname={current}
          badge={groupBadge(group, badges)}
          onNavigate={setCurrent}
        />
      )
    );
  }

  const profileActive = isActive(current, "/configuracoes");

  return (
    <aside
      aria-label="Navegação principal"
      data-rail={open ? "open" : "closed"}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden w-[4.5rem] flex-col border-r border-line bg-surface-solid transition-[width] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] md:flex",
        open && "xl:w-[17rem]"
      )}
    >
      {/* Marca + recolher */}
      <div className={cn("flex h-16 shrink-0 items-center justify-center px-3", open && "xl:h-20 xl:justify-between xl:px-4")}>
        <Link href="/dashboard" aria-label="Forge Finance, início" className="flex items-center gap-2.5">
          <Image src="/icon-f.png" alt="" width={32} height={32} priority className="h-7 w-7 object-contain xl:h-8 xl:w-8" />
          {open && <span className="brand-wordmark hidden text-xl text-foreground xl:inline">forge finance</span>}
        </Link>
        {open && (
          <button
            type="button"
            onClick={toggle}
            aria-label="Recolher menu"
            title="Recolher menu"
            aria-expanded
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-faint outline-none transition-colors hover:bg-tint-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand xl:flex"
          >
            <ToggleIcon className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {!open && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Abrir menu com nomes"
          title="Abrir menu com nomes"
          aria-expanded={false}
          className="mx-auto mb-2 hidden h-8 w-8 items-center justify-center rounded-lg text-faint outline-none transition-colors hover:bg-tint-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand xl:flex"
        >
          <ToggleIcon className="h-[18px] w-[18px]" />
        </button>
      )}

      {/* Empresa | Pessoal */}
      <div className={cn("shrink-0 px-3 pb-3", open && "xl:px-4 xl:pb-6")}>
        {open ? (
          <>
            <ScopeSelect scope={scope} compact className="xl:hidden" />
            <ScopeSelect scope={scope} className="hidden xl:block" />
          </>
        ) : (
          <ScopeSelect scope={scope} compact />
        )}
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]", open && "xl:px-4")}>
        {open ? (
          <>
            <ul className="flex flex-col gap-1 xl:hidden">{renderList(groups, false)}</ul>
            <ul className="hidden flex-col gap-1.5 xl:flex">{renderList(groups, true)}</ul>
          </>
        ) : (
          <ul className="flex flex-col gap-1">{renderList(groups, false)}</ul>
        )}

        <span aria-hidden className="mx-auto my-3 block h-px w-full bg-line xl:my-5" />

        {open ? (
          <>
            <ul className="flex flex-col gap-1 xl:hidden">{renderList([settingsGroup], false)}</ul>
            <ul className="hidden flex-col gap-1.5 xl:flex">{renderList([settingsGroup], true)}</ul>
          </>
        ) : (
          <ul className="flex flex-col gap-1">{renderList([settingsGroup], false)}</ul>
        )}
      </nav>

      {/* Rodapé fixo: plano */}
      <div className={cn("shrink-0 px-3 pb-3 empty:hidden", open && "xl:px-4")}>
        {plan && open && (
          <div className="hidden pt-3 xl:block">
            <PlanCard plan={plan} />
          </div>
        )}
      </div>

      {/* Quem está usando */}
      <div className={cn("shrink-0 border-t border-line p-3", open && "xl:px-4")}>
        <Link
          href="/configuracoes"
          aria-label={`Perfil de ${userName}`}
          title={userName}
          className={cn(
            "flex items-center justify-center gap-3 rounded-xl p-1.5 outline-none transition-colors hover:bg-tint-strong focus-visible:ring-2 focus-visible:ring-brand",
            open && "xl:justify-start",
            profileActive && "bg-tint-strong"
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsOf(userName)
            )}
          </span>
          {open && (
            <span className="hidden min-w-0 flex-1 xl:block">
              <span className="block truncate text-sm font-medium text-foreground">{userName}</span>
              <span className="block truncate text-xs text-faint">Minha conta</span>
            </span>
          )}
        </Link>
      </div>
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
      <ul className="flex items-stretch justify-between gap-0.5 overflow-x-auto px-1 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            <li key={group.title} className="min-w-[48px] flex-1">
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
