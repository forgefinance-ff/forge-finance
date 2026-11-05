"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { findGroup, isActive } from "@/components/app-sidebar";
import type { Scope } from "@/lib/scope";
import { cn } from "@/lib/utils";

/** Sub-abas do grupo atual (ex.: Lançamentos → Transações · A pagar e receber · …). */
export function SectionTabs({ scope }: { scope: Scope }) {
  const pathname = usePathname();
  const group = findGroup(scope, pathname);
  const tabs = group?.items.filter((item) => !item.hidden) ?? [];

  if (!group || tabs.length < 2) return null;

  return (
    <nav aria-label={group.title} className="mb-5 -mx-1 overflow-x-auto px-1">
      <ul className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-line bg-tint p-1">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.url);

          return (
            <li key={tab.url}>
              <Link
                href={tab.url}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand/15 text-brand-soft shadow-[inset_0_0_0_1px_rgba(168,85,247,0.35)]"
                    : "text-muted-foreground hover:bg-tint-strong hover:text-foreground"
                )}
              >
                {tab.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
