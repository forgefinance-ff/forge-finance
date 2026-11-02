"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PeriodKey } from "../data/period";

type Props = {
  period: PeriodKey;
  from: string | null;
  to: string | null;
};

const PRESETS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "Tudo" },
  { key: "today", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

const dateInputClass =
  "rounded-lg border border-line bg-background-soft px-3 py-2 text-sm text-foreground outline-none transition focus:border-violet-500";

export function PeriodFilter({ period, from, to }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [showCustom, setShowCustom] = useState(period === "custom");
  const [customFrom, setCustomFrom] = useState(period === "custom" ? from ?? "" : "");
  const [customTo, setCustomTo] = useState(period === "custom" ? to ?? "" : "");

  function go(params: Record<string, string>) {
    const query = new URLSearchParams(params).toString();

    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function selectPreset(key: PeriodKey) {
    setShowCustom(false);
    go(key === "all" ? {} : { period: key });
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    go({ period: "custom", from: customFrom, to: customTo });
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border bg-card p-4 transition-opacity ${
        isPending ? "opacity-70" : ""
      }`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold">Período de Análise</h2>
          <p className="text-sm text-muted-foreground">
            Selecione o período para atualizar todos os indicadores e gráficos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.key}
              variant={
                !showCustom && period === preset.key ? "default" : "outline"
              }
              size="sm"
              onClick={() => selectPreset(preset.key)}
            >
              {preset.label}
            </Button>
          ))}

          <Button
            variant={showCustom || period === "custom" ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setShowCustom((value) => !value)}
          >
            <CalendarDays className="h-4 w-4" />
            Personalizado
          </Button>
        </div>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            De
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className={dateInputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Até
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className={dateInputClass}
            />
          </label>

          <Button
            size="sm"
            disabled={!customFrom || !customTo || isPending}
            onClick={applyCustom}
          >
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}
