"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseIcon,
  ChartBarIcon,
  FolderIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  CreditCardIcon,
  MessageCircleIcon,
  PercentIcon,
  ListIcon,
  SparklesIcon,
  UploadIcon,
  ReceiptTextIcon,
  Settings2Icon,
  TagsIcon,
  TargetIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { ScopeSwitcher } from "@/components/scope-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
};

const mainItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Transações", url: "/transacoes", icon: ListIcon },
  { title: "Importar extrato", url: "/importar", icon: UploadIcon },
  { title: "Assistente IA", url: "/assistente", icon: SparklesIcon },
  { title: "Contas a pagar/receber", url: "/contas-a-pagar-receber", icon: ReceiptTextIcon },
  { title: "Contas", url: "/contas", icon: LandmarkIcon },
  { title: "Cartões", url: "/cartoes", icon: WalletCardsIcon },
  { title: "Categorias", url: "/categorias", icon: TagsIcon },
  { title: "Relatórios", url: "/relatorios", icon: ChartBarIcon },
  { title: "WhatsApp", url: "/whatsapp", icon: MessageCircleIcon },
  { title: "Metas", url: "/metas", icon: TargetIcon },
  { title: "Investimentos", url: "/investimentos", icon: FolderIcon },
  { title: "Planos", url: "/planos", icon: CreditCardIcon },
];

/** Itens que só aparecem no escopo Empresa (entram depois de "Categorias"). */
const businessItems: NavItem[] = [
  { title: "Clientes", url: "/clientes", icon: UsersIcon },
  { title: "Impostos", url: "/impostos", icon: PercentIcon },
];

/** No escopo Empresa, "Gestão" fica logo depois do Dashboard. */
const businessHome: NavItem = { title: "Gestão", url: "/gestao", icon: BriefcaseIcon };

export function getNavItems(scope: Scope): NavItem[] {
  if (scope !== "business") return mainItems;

  const at = mainItems.findIndex((item) => item.url === "/categorias") + 1;
  const items = [...mainItems.slice(0, at), ...businessItems, ...mainItems.slice(at)];
  return [items[0], businessHome, ...items.slice(1)];
}

const settingsItem: NavItem = {
  title: "Configurações",
  url: "/configuracoes",
  icon: Settings2Icon,
};

function isActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

function RailItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <li className="group/item relative">
      <Link
        href={item.url}
        aria-label={item.title}
        aria-current={active ? "page" : undefined}
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

      {/* Tooltip acessível: aparece no hover e no foco por teclado */}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-surface-solid px-2.5 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-hover/item:opacity-100 group-focus-within/item:opacity-100"
      >
        {item.title}
      </span>
    </li>
  );
}

/** Barra lateral compacta (desktop) — apenas ícones. */
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

      <nav className="flex w-full flex-1 flex-col items-center overflow-y-auto overflow-x-visible py-1">
        <ul className="flex flex-col items-center gap-2 rounded-[28px] border border-line bg-tint p-2">
          {getNavItems(scope).map((item) => (
            <RailItem
              key={item.url}
              item={item}
              active={isActive(pathname, item.url)}
            />
          ))}
        </ul>
      </nav>

      <ul className="mt-3 flex flex-col items-center gap-3">
        <li>
          <ThemeToggle placement="right" />
        </li>
        <RailItem
          item={settingsItem}
          active={isActive(pathname, settingsItem.url)}
        />
      </ul>
    </aside>
  );
}

/** Navegação móvel: barra inferior com rolagem interna (sem rolagem horizontal da página). */
export function MobileNav({ scope }: { scope: Scope }) {
  const pathname = usePathname();
  const items = [...getNavItems(scope), settingsItem];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-sidebar pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="flex items-center gap-1 overflow-x-auto px-3 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.url);

          return (
            <li key={item.url} className="shrink-0">
              <Link
                href={item.url}
                aria-label={item.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300",
                  active
                    ? "border-brand-bright/40 bg-brand/15 text-brand-soft shadow-[0_0_18px_rgba(168,85,247,0.4)]"
                    : "border-transparent text-faint"
                )}
              >
                <Icon className="h-5 w-5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

