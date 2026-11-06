"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";

import type { GuideProgress } from "@/lib/guide";

/** Barra fina no topo de todas as telas até a pessoa terminar os primeiros passos. */
export function GuideBanner({ progress }: { progress: GuideProgress }) {
  const pathname = usePathname();
  if (pathname === "/comecar") return null;

  const pct = Math.round((progress.done / progress.total) * 100);
  const next = progress.next;

  return (
    <Link
      href="/comecar"
      className="mb-5 flex items-center gap-4 rounded-[18px] border border-brand-bright/30 bg-brand/10 px-5 py-3 transition hover:bg-brand/15"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-soft">
          Primeiros passos · {progress.done} de {progress.total}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">Próximo: {next}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-tint-strong">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-400" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="hidden items-center gap-1 text-sm font-semibold text-brand-soft sm:flex">
        Continuar <ArrowRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}
