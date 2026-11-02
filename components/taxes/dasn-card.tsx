import { FileTextIcon } from "lucide-react";

import { daysBetween, formatDateBR } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** Lembrete da Declaração Anual do MEI, com o prazo informado pelo usuário. */
export function DasnCard({ dueDate, today }: { dueDate: string | null; today: string }) {
  const days = dueDate ? daysBetween(today, dueDate) : null;
  const tone =
    days === null ? "none" : days < 0 ? "danger" : days <= 30 ? "warning" : "ok";

  return (
    <section
      className={cn(
        "rounded-[22px] border bg-surface p-6",
        tone === "danger" ? "border-danger/40" : tone === "warning" ? "border-warning/40" : "border-line"
      )}
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <FileTextIcon className="h-5 w-5 text-brand-soft" />
        Declaração Anual (DASN-SIMEI)
      </h2>

      {dueDate === null || days === null ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Informe o prazo da declaração nas configurações do MEI para receber o lembrete aqui.
        </p>
      ) : (
        <>
          <p
            className={cn(
              "mt-3 text-2xl font-bold",
              tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground"
            )}
          >
            {days < 0
              ? `Prazo encerrado há ${-days} ${days === -1 ? "dia" : "dias"}`
              : days === 0
                ? "Vence hoje"
                : `Faltam ${days} ${days === 1 ? "dia" : "dias"}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prazo informado: {formatDateBR(dueDate)}. A declaração é feita no Portal do
            Empreendedor.
          </p>
        </>
      )}
    </section>
  );
}
