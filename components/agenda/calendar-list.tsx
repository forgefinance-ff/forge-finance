"use client";

import { useOptimistic, useState, useTransition } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { deleteCalendar, saveCalendar, setCalendarVisible } from "@/app/actions/agenda";
import { inputClass } from "@/components/customers/customer-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AGENDA_COLORS,
  COLOR_LABEL,
  colorValue,
  type AgendaCalendar,
  type AgendaColor,
  type AgendaScope,
} from "@/lib/agenda/shared";
import { cn } from "@/lib/utils";

const SCOPE_TITLE: Record<AgendaScope, string> = { personal: "Pessoal", business: "Empresa" };

type Editing = { id: string | null; name: string; color: AgendaColor; scope: AgendaScope; financial: boolean };

export function CalendarList({
  calendars,
  canBusiness,
  activeScope,
}: {
  calendars: AgendaCalendar[];
  canBusiness: boolean;
  activeScope: AgendaScope;
}) {
  const [optimistic, setOptimistic] = useOptimistic(
    calendars,
    (state, change: { id: string; visible: boolean }) =>
      state.map((c) => (c.id === change.id ? { ...c, isVisible: change.visible } : c))
  );
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<Editing | null>(null);

  const scopes: AgendaScope[] = [...new Set(optimistic.map((c) => c.scope))];

  function toggle(cal: AgendaCalendar) {
    startTransition(async () => {
      setOptimistic({ id: cal.id, visible: !cal.isVisible });
      const result = await setCalendarVisible(cal.id, !cal.isVisible);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {scopes.map((scope) => (
        <div key={scope}>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">
              {scopes.length > 1 ? `Agendas · ${SCOPE_TITLE[scope]}` : "Minhas agendas"}
            </p>
            <button
              type="button"
              aria-label={`Nova agenda ${SCOPE_TITLE[scope]}`}
              title="Nova agenda"
              onClick={() => setEditing({ id: null, name: "", color: "azul", scope, financial: false })}
              className="rounded-full p-1 text-muted-foreground hover:bg-tint-strong hover:text-foreground"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-0.5">
            {optimistic
              .filter((c) => c.scope === scope)
              .map((cal) => (
                <li key={cal.id} className="group flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-tint-strong">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={cal.isVisible}
                      onChange={() => toggle(cal)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/50"
                      style={{
                        borderColor: colorValue(cal.color),
                        background: cal.isVisible ? colorValue(cal.color) : "transparent",
                      }}
                    >
                      {cal.isVisible && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3 text-white">
                          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      )}
                    </span>
                    <span className={cn("truncate", cal.isVisible ? "text-foreground" : "text-muted-foreground")}>
                      {cal.name}
                    </span>
                  </label>
                  <button
                    type="button"
                    aria-label={`Editar agenda ${cal.name}`}
                    onClick={() =>
                      setEditing({ id: cal.id, name: cal.name, color: cal.color, scope: cal.scope, financial: cal.kind === "financial" })
                    }
                    className="rounded-full p-1 text-faint opacity-0 transition hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ))}
      {!canBusiness && activeScope === "personal" && (
        <p className="text-xs text-faint">As agendas da Empresa aparecem quando você usa o modo Empresa.</p>
      )}

      <CalendarDialog editing={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function CalendarDialog({ editing, onClose }: { editing: Editing | null; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [color, setColor] = useState<AgendaColor>("azul");
  const [forId, setForId] = useState<string | null | undefined>(undefined);

  // Reabre com a cor da agenda escolhida.
  const key = editing ? editing.id ?? `new-${editing.scope}` : null;
  if (editing && forId !== key) {
    setForId(key);
    setColor(editing.color);
    setError(null);
  }

  function submit(formData: FormData) {
    if (!editing) return;
    formData.set("color", color);
    formData.set("scope", editing.scope);
    if (editing.id) formData.set("id", editing.id);
    startTransition(async () => {
      const result = await saveCalendar(formData);
      if (!result.ok) return setError(result.error);
      toast.success(editing.id ? "Agenda atualizada." : "Agenda criada.");
      onClose();
    });
  }

  function remove() {
    if (!editing?.id) return;
    if (!window.confirm(`Excluir a agenda "${editing.name}" e todos os eventos dela?`)) return;
    startTransition(async () => {
      const result = await deleteCalendar(editing.id!);
      if (!result.ok) return setError(result.error);
      toast.success("Agenda excluída.");
      onClose();
    });
  }

  return (
    <Dialog open={editing !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {editing && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <DialogHeader>
              <DialogTitle>{editing.id ? "Editar agenda" : `Nova agenda · ${SCOPE_TITLE[editing.scope]}`}</DialogTitle>
              {editing.financial && (
                <DialogDescription>
                  Mostra contas a pagar e a receber, cobranças e impostos do MEI. Os itens vêm direto do financeiro.
                </DialogDescription>
              )}
            </DialogHeader>
            <div>
              <label htmlFor="calendar-name" className="mb-2 block text-sm text-text-soft">
                Nome
              </label>
              <input id="calendar-name" name="name" required maxLength={60} defaultValue={editing.name} className={inputClass} autoFocus />
            </div>
            <fieldset>
              <legend className="mb-2 block text-sm text-text-soft">Cor</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(AGENDA_COLORS) as AgendaColor[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={COLOR_LABEL[c]}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition",
                      color === c && "ring-2 ring-foreground"
                    )}
                    style={{ background: AGENDA_COLORS[c] }}
                  />
                ))}
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2 sm:justify-between">
              {editing.id && !editing.financial ? (
                <Button type="button" variant="ghost" className="text-danger" onClick={remove} disabled={isPending}>
                  Excluir agenda
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
