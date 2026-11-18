"use client";

import { useState, useTransition } from "react";
import { MapPinIcon, PlusIcon, Trash2Icon, UsersIcon, VideoIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { createEvent, deleteEvent, updateEvent } from "@/app/actions/agenda";
import { inputClass } from "@/components/customers/customer-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AGENDA_COLORS,
  COLOR_LABEL,
  colorValue,
  type AgendaAttendee,
  type AgendaCalendar,
  type AgendaColor,
  type AgendaEvent,
} from "@/lib/agenda/shared";
import { addDays, minutesToTime, utcToLocal } from "@/lib/agenda/time";
import { cn } from "@/lib/utils";

export type EventDraft = {
  id: string | null;
  calendarId: string;
  kind: "event" | "task";
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  meetingUrl: string;
  description: string;
  color: AgendaColor | "";
  attendees: AgendaAttendee[];
};

/** Evento salvo -> formulário (no fuso de São Paulo). */
export function draftFromEvent(event: AgendaEvent): EventDraft {
  const s = utcToLocal(event.start);
  const e = utcToLocal(event.end);
  return {
    id: event.id,
    calendarId: event.calendarId,
    kind: event.kind,
    title: event.title,
    allDay: event.allDay,
    startDate: s.date,
    startTime: s.time,
    // Dia inteiro guarda o fim exclusivo; o formulário mostra o último dia.
    endDate: event.allDay ? addDays(e.date, -1) < s.date ? s.date : addDays(e.date, -1) : e.date,
    endTime: e.time,
    location: event.location ?? "",
    meetingUrl: event.meetingUrl ?? "",
    description: event.description ?? "",
    color: event.color ?? "",
    attendees: event.attendees,
  };
}

const SCOPE_TITLE = { personal: "Pessoal", business: "Empresa" } as const;

function plusOneHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return minutesToTime(Math.min(h * 60 + m + 60, 23 * 60 + 59));
}

export function EventDialog({
  draft,
  calendars,
  onClose,
  onSaved,
}: {
  draft: EventDraft | null;
  calendars: AgendaCalendar[];
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        {draft && (
          <EventForm key={draft.id ?? `${draft.startDate}-${draft.startTime}`} draft={draft} calendars={calendars} onClose={onClose} onSaved={onSaved} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EventForm({
  draft,
  calendars,
  onClose,
  onSaved,
}: {
  draft: EventDraft;
  calendars: AgendaCalendar[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [allDay, setAllDay] = useState(draft.allDay);
  const [startDate, setStartDate] = useState(draft.startDate);
  const [endDate, setEndDate] = useState(draft.endDate);
  const [startTime, setStartTime] = useState(draft.startTime);
  const [endTime, setEndTime] = useState(draft.endTime);
  const [color, setColor] = useState<AgendaColor | "">(draft.color);
  const [calendarId, setCalendarId] = useState(draft.calendarId);
  const [attendees, setAttendees] = useState<AgendaAttendee[]>(draft.attendees);
  const [more, setMore] = useState(Boolean(draft.id) || draft.attendees.length > 0 || Boolean(draft.location || draft.description));

  const calendar = calendars.find((c) => c.id === calendarId);
  const scopes = new Set(calendars.map((c) => c.scope));

  function submit(formData: FormData) {
    formData.set("all_day", allDay ? "true" : "false");
    formData.set("color", color);
    formData.set("calendar_id", calendarId);
    formData.set(
      "attendees",
      JSON.stringify(attendees.filter((a) => a.name.trim() || a.email?.trim() || a.phone?.trim()))
    );
    if (draft.id) formData.set("id", draft.id);
    setError(null);
    startTransition(async () => {
      const result = draft.id ? await updateEvent(formData) : await createEvent(formData);
      if (!result.ok) return setError(result.error);
      toast.success(draft.id ? "Evento atualizado." : "Evento criado.");
      onSaved();
      onClose();
    });
  }

  function remove() {
    if (!draft.id) return;
    if (!window.confirm(`Excluir "${draft.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteEvent(draft.id!);
      if (!result.ok) return setError(result.error);
      toast.success("Evento excluído.");
      onSaved();
      onClose();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="space-y-4"
    >
      <DialogHeader>
        <DialogTitle>{draft.id ? "Editar evento" : "Novo evento"}</DialogTitle>
      </DialogHeader>

      <input
        name="title"
        required
        maxLength={200}
        defaultValue={draft.title}
        placeholder="Adicionar título"
        aria-label="Título"
        autoFocus
        className={cn(inputClass, "text-lg")}
      />

      <div className="space-y-3 rounded-2xl border border-line p-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
          Dia inteiro
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
          <label className="sr-only" htmlFor="ev-start-date">Data de início</label>
          <input
            id="ev-start-date"
            name="start_date"
            type="date"
            required
            value={startDate}
            onChange={(e) => {
              const next = e.target.value;
              // Mantém a duração em dias ao mudar o início.
              if (next && endDate < next) setEndDate(next);
              setStartDate(next);
            }}
            className={inputClass}
          />
          {!allDay && (
            <>
              <label className="sr-only" htmlFor="ev-start-time">Hora de início</label>
              <input
                id="ev-start-time"
                name="start_time"
                type="time"
                required
                value={startTime}
                onChange={(e) => {
                  const next = e.target.value;
                  if (startDate === endDate && endTime <= next) setEndTime(plusOneHour(next));
                  setStartTime(next);
                }}
                className={inputClass}
              />
            </>
          )}
          <label className="sr-only" htmlFor="ev-end-date">Data de fim</label>
          <input
            id="ev-end-date"
            name="end_date"
            type="date"
            required
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
          {!allDay && (
            <>
              <label className="sr-only" htmlFor="ev-end-time">Hora de fim</label>
              <input
                id="ev-end-time"
                name="end_time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ev-calendar" className="mb-2 block text-sm text-text-soft">
            Agenda
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
              style={{ background: colorValue(color || calendar?.color) }}
            />
            <select
              id="ev-calendar"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              className={cn(inputClass, "pl-9")}
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {scopes.size > 1 ? `${c.name} (${SCOPE_TITLE[c.scope]})` : c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ev-color" className="mb-2 block text-sm text-text-soft">
            Cor
          </label>
          <select id="ev-color" value={color} onChange={(e) => setColor(e.target.value as AgendaColor | "")} className={inputClass}>
            <option value="">Cor da agenda</option>
            {(Object.keys(AGENDA_COLORS) as AgendaColor[]).map((c) => (
              <option key={c} value={c}>
                {COLOR_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!more ? (
        <button type="button" onClick={() => setMore(true)} className="text-sm font-medium text-brand-bright hover:underline">
          Mais opções (local, link, descrição, convidados)
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <MapPinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input name="location" maxLength={300} defaultValue={draft.location} placeholder="Local" aria-label="Local" className={cn(inputClass, "pl-10")} />
          </div>
          <div className="relative">
            <VideoIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              name="meeting_url"
              type="url"
              maxLength={500}
              defaultValue={draft.meetingUrl}
              placeholder="Link da reunião (https://...)"
              aria-label="Link da reunião"
              pattern="https://.*"
              className={cn(inputClass, "pl-10")}
            />
          </div>
          <textarea
            name="description"
            maxLength={5000}
            rows={3}
            defaultValue={draft.description}
            placeholder="Descrição"
            aria-label="Descrição"
            className={inputClass}
          />

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-text-soft">
              <UsersIcon className="h-4 w-4" /> Convidados
              <span className="text-xs text-faint">(só ficam anotados; ninguém é avisado)</span>
            </p>
            {attendees.map((a, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <input
                  value={a.name}
                  onChange={(e) => setAttendees(attendees.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  placeholder="Nome"
                  aria-label={`Nome do convidado ${i + 1}`}
                  maxLength={120}
                  className={cn(inputClass, "py-2")}
                />
                <button
                  type="button"
                  aria-label={`Remover convidado ${i + 1}`}
                  onClick={() => setAttendees(attendees.filter((_, j) => j !== i))}
                  className="rounded-full p-2 text-faint hover:text-danger sm:order-last"
                >
                  <XIcon className="h-4 w-4" />
                </button>
                <input
                  value={a.email ?? ""}
                  onChange={(e) => setAttendees(attendees.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
                  placeholder="E-mail"
                  type="email"
                  aria-label={`E-mail do convidado ${i + 1}`}
                  className={cn(inputClass, "col-span-2 py-2 sm:col-span-1")}
                />
                <input
                  value={a.phone ?? ""}
                  onChange={(e) => setAttendees(attendees.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))}
                  placeholder="WhatsApp com DDD"
                  inputMode="tel"
                  aria-label={`WhatsApp do convidado ${i + 1}`}
                  className={cn(inputClass, "col-span-2 py-2 sm:col-span-1")}
                />
              </div>
            ))}
            {attendees.length < 50 && (
              <button
                type="button"
                onClick={() => setAttendees([...attendees, { name: "", email: null, phone: null }])}
                className="flex items-center gap-1.5 text-sm font-medium text-brand-bright hover:underline"
              >
                <PlusIcon className="h-4 w-4" /> Adicionar convidado
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {draft.id ? (
          <Button type="button" variant="ghost" className="text-danger" onClick={remove} disabled={isPending}>
            <Trash2Icon /> Excluir
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || calendars.length === 0}>
            {isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
