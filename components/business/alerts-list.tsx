import { AlertTriangleIcon, InfoIcon, OctagonAlertIcon } from "lucide-react";

import type { BusinessAlert } from "@/lib/business-panel";
import { cn } from "@/lib/utils";

export function AlertsList({ alerts }: { alerts: BusinessAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {alerts.map((alert) => {
        const Icon =
          alert.tone === "danger" ? OctagonAlertIcon : alert.tone === "warning" ? AlertTriangleIcon : InfoIcon;
        return (
          <div
            key={alert.title}
            role={alert.tone === "danger" ? "alert" : undefined}
            className={cn(
              "flex gap-3 rounded-2xl border px-4 py-3",
              alert.tone === "danger" && "border-danger/40 bg-danger/10",
              alert.tone === "warning" && "border-warning/40 bg-warning/10",
              alert.tone === "info" && "border-brand-bright/30 bg-brand/10"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0",
                alert.tone === "danger" && "text-danger",
                alert.tone === "warning" && "text-warning",
                alert.tone === "info" && "text-brand-soft"
              )}
            />
            <div>
              <p className="text-sm font-semibold text-foreground">{alert.title}</p>
              <p className="mt-0.5 text-sm text-text-soft">{alert.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
