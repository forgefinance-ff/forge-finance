import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { parsePeriod, type ReportSearchParams } from "@/app/(dashboard)/relatorios/data/period";
import { FullReportView } from "@/components/report/full-report-view";
import { PrintButton } from "@/components/report/print-button";
import { getFullReport } from "@/lib/full-report";
import { getAuthUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Relatório completo · Forge Finance",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "all", label: "Tudo" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
] as const;

type Props = {
  searchParams?: Promise<ReportSearchParams>;
};

export default async function FullReportPage({ searchParams }: Props) {
  const params = (await searchParams) ?? {};
  const user = await getAuthUser();
  if (!user) redirect("/login?next=%2Frelatorio-completo");

  const period = parsePeriod(params);
  const report = await getFullReport(period);
  if (!report) redirect("/login?next=%2Frelatorio-completo");

  return (
    <div className="rpt-root">
      <div className="rpt-toolbar">
        <Link href="/relatorios" className="rpt-btn">
          ← Relatórios
        </Link>
        <div className="rpt-periods">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={p.key === "all" ? "/relatorio-completo" : `/relatorio-completo?period=${p.key}`}
              className="rpt-chip"
              aria-current={period.key === p.key}
            >
              {p.label}
            </Link>
          ))}
          {period.key === "custom" || period.key === "today" ? (
            <span className="rpt-chip" aria-current="true">
              {period.key === "today" ? "Hoje" : "Personalizado"}
            </span>
          ) : null}
        </div>
        <span className="rpt-toolbar-spacer" />
        <PrintButton />
      </div>

      <FullReportView report={report} />
    </div>
  );
}
