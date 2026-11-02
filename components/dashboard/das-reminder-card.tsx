import Link from "next/link";
import { ArrowRightIcon, ReceiptTextIcon } from "lucide-react";

import { formatDateBR } from "@/lib/dates";
import { formatCurrency } from "@/lib/formatters";
import type { DasReminder } from "@/lib/mei";
import { competenceLabel } from "@/lib/mei-shared";
import { cn } from "@/lib/utils";

/** Cartão "DAS vence em X dias" (só no escopo Empresa). */
export function DasReminderCard({ reminder }: { reminder: DasReminder }) {
  if (!reminder) return null;

  let title: string;
  let detail: string;
  let tone: "danger" | "warning" | "ok";

  if (reminder.kind === "missing") {
    title = `Gere o DAS de ${competenceLabel(reminder.competence)}`;
    detail = "A guia desta competência ainda não foi registrada.";
    tone = "warning";
  } else {
    const { das, days } = reminder;
    title =
      days < 0
        ? `DAS atrasado há ${-days} ${days === -1 ? "dia" : "dias"}`
        : days === 0
          ? "DAS vence hoje"
          : `DAS vence em ${days} ${days === 1 ? "dia" : "dias"}`;
    detail = `Competência ${competenceLabel(das.competence)} · ${formatCurrency(das.amount)} · ${formatDateBR(das.due_date)}`;
    tone = days < 0 ? "danger" : days <= 5 ? "warning" : "ok";
  }

  return (
    <Link
      href="/impostos"
      className={cn(
        "group flex items-center gap-4 rounded-[22px] border bg-surface p-5 transition",
        tone === "danger"
          ? "border-danger/40 hover:border-danger/60"
          : tone === "warning"
            ? "border-warning/40 hover:border-warning/60"
            : "border-line hover:border-line-strong"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
          tone === "danger"
            ? "border-danger/30 bg-danger/10 text-danger"
            : tone === "warning"
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-brand-bright/30 bg-brand/15 text-brand-soft"
        )}
      >
        <ReceiptTextIcon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </div>

      <ArrowRightIcon className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5" />
    </Link>
  );
}
