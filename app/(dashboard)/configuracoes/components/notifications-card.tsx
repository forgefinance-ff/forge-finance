"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveNotificationPrefs } from "@/app/actions/account";

type Prefs = { weekly_summary: boolean; budget_alerts: boolean };

const OPTIONS: { key: keyof Prefs; title: string; description: string }[] = [
  {
    key: "weekly_summary",
    title: "Resumo semanal no WhatsApp",
    description: "Todo domingo à noite: quanto entrou, quanto saiu e o que vence na semana.",
  },
  {
    key: "budget_alerts",
    title: "Alertas de orçamento",
    description: "Ao registrar um gasto pelo WhatsApp, avisa quanto ainda cabe na categoria.",
  },
];

export function NotificationsCard({ initial, hasWhatsApp }: { initial: Prefs; hasWhatsApp: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, start] = useTransition();

  function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    start(async () => {
      const result = await saveNotificationPrefs(next);
      if (!result.ok) {
        setPrefs(prefs);
        toast.error(result.error);
      }
    });
  }

  return (
    <section className="rounded-[22px] border border-line bg-surface p-6" aria-labelledby="notif-title">
      <h2 id="notif-title" className="text-lg font-semibold text-foreground">
        Avisos
      </h2>
      {!hasWhatsApp && (
        <p className="mt-1 text-sm text-muted-foreground">Conecte o WhatsApp para receber os avisos.</p>
      )}
      <ul className="mt-4 divide-y divide-line">
        {OPTIONS.map((o) => (
          <li key={o.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p id={`notif-${o.key}`} className="font-medium text-foreground">
                {o.title}
              </p>
              <p className="text-sm text-muted-foreground">{o.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[o.key]}
              aria-labelledby={`notif-${o.key}`}
              disabled={pending}
              onClick={() => toggle(o.key)}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                prefs[o.key] ? "bg-brand" : "bg-line-strong"
              }`}
            >
              <span
                aria-hidden
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  prefs[o.key] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
