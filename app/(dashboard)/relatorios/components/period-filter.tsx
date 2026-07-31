"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PeriodFilter() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="font-semibold">Período de Análise</h2>
        <p className="text-sm text-slate-400">
          Selecione o período para atualizar todos os indicadores e gráficos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          Hoje
        </Button>

        <Button variant="outline" size="sm">
          7 dias
        </Button>

        <Button variant="outline" size="sm">
          30 dias
        </Button>

        <Button variant="outline" size="sm">
          90 dias
        </Button>

        <Button variant="default" size="sm" className="gap-2">
          <CalendarDays className="h-4 w-4" />
          Personalizado
        </Button>
      </div>
    </div>
  );
}