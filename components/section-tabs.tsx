"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { BadgeCount, findGroup, isActive, type NavBadges } from "@/components/app-sidebar";
import type { Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { TabsPill, useOptimisticPath, useSlidingPill } from "@/components/motion";

/** Sub-abas do grupo atual (ex.: Lançamentos → Transações · A pagar e receber · …). */
export function SectionTabs({ scope, badges = {} }: { scope: Scope; badges?: NavBadges }) {
  const pathname = usePathname();
  const [current, setCurrent] = useOptimisticPath(pathname);
  const group = findGroup(scope, pathname);
  const tabs = group?.items.filter((item) => !item.hidden) ?? [];
  const { containerRef, pillRef } = useSlidingPill<HTMLUListElement>(current);
  const navRef = useRef<HTMLElement>(null);

  // No celular as abas rolam para o lado: traz a aba atual para a área visível.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const center = () => {
      const active = nav.querySelector<HTMLElement>('[data-active="true"]');
      if (!active || nav.scrollWidth <= nav.clientWidth) return;
      const navBox = nav.getBoundingClientRect();
      const box = active.getBoundingClientRect();
      const left = nav.scrollLeft + (box.left - navBox.left) - (navBox.width - box.width) / 2;
      nav.scrollLeft = Math.max(0, Math.min(left, nav.scrollWidth - nav.clientWidth));
    };
    center();
    // As fontes podem chegar depois e mudar a largura das abas.
    document.fonts?.ready.then(center).catch(() => {});
  }, [current]);

  if (!group || tabs.length < 2) return null;

  return (
    <nav ref={navRef} aria-label={group.title} className="mb-5 -mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul ref={containerRef} className="glass relative inline-flex min-w-max items-center gap-1 rounded-full p-1">
        <TabsPill pillRef={pillRef} />
        {tabs.map((tab) => {
          const active = isActive(current, tab.url);

          return (
            <li key={tab.url}>
              <Link
                href={tab.url}
                onClick={() => setCurrent(tab.url)}
                aria-current={active ? "page" : undefined}
                data-active={active}
                className={cn(
                  "t-tab flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                  active
                    ? "text-background"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.title}
                {badges[tab.url] && <BadgeCount badge={badges[tab.url]!} />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
