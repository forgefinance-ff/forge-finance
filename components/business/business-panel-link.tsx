import Link from "next/link";
import { ArrowRightIcon, BriefcaseIcon } from "lucide-react";

/** Atalho do dashboard (escopo Empresa) para o painel de gestão. */
export function BusinessPanelLink() {
  return (
    <Link
      href="/gestao"
      className="group flex items-center gap-4 rounded-[22px] border border-brand-bright/30 bg-brand/10 p-5 transition hover:border-brand-bright/50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand-bright/30 bg-brand/15 text-brand-soft">
        <BriefcaseIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">Gestão da empresa</p>
        <p className="text-sm text-muted-foreground">
          Caixa dos próximos 90 dias, lucro do mês, ponto de equilíbrio e inadimplência.
        </p>
      </div>
      <ArrowRightIcon className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </Link>
  );
}
