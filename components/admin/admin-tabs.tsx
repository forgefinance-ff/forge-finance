"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/usuarios", label: "Usuários" },
  { href: "/admin/custos", label: "Custos" },
  { href: "/admin/suporte", label: "Suporte" },
  { href: "/admin/registro", label: "Histórico" },
];

export function AdminTabs({ supportUnread = 0 }: { supportUnread?: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do admin" className="flex w-fit flex-wrap gap-1 rounded-xl border border-line bg-tint p-1">
      {TABS.map((tab) => {
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.href === "/admin/suporte" && supportUnread > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-white">
                {supportUnread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
