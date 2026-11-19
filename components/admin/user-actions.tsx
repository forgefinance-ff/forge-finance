"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  disconnectWhatsApp,
  extendAccess,
  grantPro,
  resetAiQuota,
  revokePro,
  type AdminActionResult,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Kind = "grant" | "extend" | "revoke" | "reset_ai" | "disconnect";

const COPY: Record<Kind, { label: string; title: string; description: string; days?: boolean; danger?: boolean }> = {
  grant: { label: "Liberar MEI", title: "Liberar o Forge MEI", description: "Para fundador, contador parceiro ou cortesia. Deixe 0 dias para sem prazo.", days: true },
  extend: { label: "Estender", title: "Estender o acesso", description: "Soma dias ao prazo atual do acesso manual.", days: true },
  revoke: { label: "Retirar MEI", title: "Retirar o acesso manual", description: "A pessoa volta para o Free. Assinaturas pagas não são afetadas.", danger: true },
  reset_ai: { label: "Zerar IA", title: "Zerar a cota de IA do mês", description: "As consultas usadas neste mês voltam a zero." },
  disconnect: { label: "Desconectar WhatsApp", title: "Desconectar o WhatsApp", description: "Use quando a pessoa trocar de número. Ela conecta de novo pelo app.", danger: true },
};

const RUN: Record<Kind, (input: unknown) => Promise<AdminActionResult>> = {
  grant: grantPro,
  extend: extendAccess,
  revoke: revokePro,
  reset_ai: resetAiQuota,
  disconnect: disconnectWhatsApp,
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function UserActions({
  userId,
  email,
  accessSource,
  hasDeadline,
  paying,
  whatsapp,
  aiUsed,
}: {
  userId: string;
  email: string;
  accessSource: string;
  hasDeadline: boolean;
  paying: boolean;
  whatsapp: boolean;
  aiUsed: number;
}) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const available: Kind[] = [];
  if (!paying && accessSource !== "admin") available.push("grant");
  if (accessSource === "admin" && hasDeadline) available.push("extend");
  if (accessSource === "admin") available.push("revoke");
  if (aiUsed > 0) available.push("reset_ai");
  if (whatsapp) available.push("disconnect");

  function submit(form: FormData) {
    if (!kind) return;
    setError(null);
    startTransition(async () => {
      const result = await RUN[kind]({
        userId,
        reason: String(form.get("reason") ?? ""),
        days: form.get("days") ?? undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(result.message);
      setKind(null);
    });
  }

  if (available.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  const copy = kind ? COPY[kind] : null;

  return (
    <>
      <div className="flex flex-wrap justify-end gap-1.5">
        {available.map((k) => (
          <Button key={k} size="xs" variant={COPY[k].danger ? "outline" : "secondary"} onClick={() => { setError(null); setKind(k); }}>
            {COPY[k].label}
          </Button>
        ))}
      </div>

      <Dialog open={kind !== null} onOpenChange={(open) => !open && setKind(null)}>
        <DialogContent>
          {copy && (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                submit(new FormData(event.currentTarget));
              }}
            >
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>
                  {email}. {copy.description}
                </DialogDescription>
              </DialogHeader>

              {copy.days && (
                <div>
                  <label htmlFor="admin-days" className="mb-2 block text-sm text-muted-foreground">
                    Dias
                  </label>
                  <input
                    id="admin-days"
                    name="days"
                    type="number"
                    inputMode="numeric"
                    min={kind === "extend" ? 1 : 0}
                    max={kind === "extend" ? 365 : 3650}
                    defaultValue={kind === "extend" ? 7 : 30}
                    required
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label htmlFor="admin-reason" className="mb-2 block text-sm text-muted-foreground">
                  Motivo (fica no registro)
                </label>
                <input
                  id="admin-reason"
                  name="reason"
                  required
                  minLength={3}
                  maxLength={300}
                  placeholder="Ex.: contador parceiro, fundador"
                  className={inputClass}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setKind(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant={copy.danger ? "destructive" : "default"} disabled={isPending}>
                  {isPending ? "Salvando…" : "Confirmar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
