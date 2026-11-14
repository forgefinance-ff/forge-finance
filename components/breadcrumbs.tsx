"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

import { findGroup, isActive } from "@/components/app-sidebar";
import type { Scope } from "@/lib/scope";

/** Caminho da página atual: Início › Lançamentos › Transações. */
export function Breadcrumbs({ scope }: { scope: Scope }) {
  const pathname = usePathname();
  const group = findGroup(scope, pathname);
  const page = group?.items.find((item) => isActive(pathname, item.url));

  const crumbs: { title: string; url?: string }[] = [{ title: "Início", url: "/dashboard" }];
  if (group && group.title !== "Dashboard") {
    const multi = group.items.filter((item) => !item.hidden).length > 1;
    if (multi) crumbs.push({ title: group.title, url: group.items[0].url });
    if (page) crumbs.push({ title: page.title });
  }

  if (crumbs.length < 2) return null;

  return (
    <nav aria-label="Você está em" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.title}-${index}`} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon className="h-3.5 w-3.5 text-faint" aria-hidden />}
              {last || !crumb.url ? (
                <span aria-current={last ? "page" : undefined} className={last ? "font-medium text-foreground" : undefined}>
                  {crumb.title}
                </span>
              ) : (
                <Link href={crumb.url} className="inline-flex min-h-6 items-center rounded-md transition-colors hover:text-foreground">
                  {crumb.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
