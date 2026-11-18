"use server";

import { revalidatePath } from "next/cache";

import { fail, type ActionResult } from "@/lib/action-result";
import { isAgendaColor } from "@/lib/agenda/shared";
import { addDays, isIsoDate, isTime, localToUtcIso } from "@/lib/agenda/time";
import { canUseBusiness } from "@/lib/scope-server";
import { createClient, getAuthUser } from "@/lib/supabase/server";

type Db = Awaited<ReturnType<typeof createClient>>;

async function session() {
  const user = await getAuthUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  return { db: await createClient(), userId: user.id };
}

function done(): ActionResult {
  revalidatePath("/agenda");
  return { ok: true };
}

function text(value: FormDataEntryValue | null, max: number): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;
  if (v.length > max) throw new Error(`Texto muito longo (máximo ${max} caracteres).`);
  return v;
}

/** Agenda do usuário que aceita eventos; confere o acesso à Empresa. */
async function ownCalendar(db: Db, userId: string, calendarId: string) {
  const { data, error } = await db
    .from("calendars")
    .select("id, scope, kind")
    .eq("id", calendarId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Agenda não encontrada.");
  if (data.kind !== "custom") throw new Error("A agenda financeira é automática: escolha outra agenda.");
  if (data.scope === "business" && !(await canUseBusiness())) {
    throw new Error("A agenda da Empresa faz parte do plano com Empresa.");
  }
  return data as { id: string; scope: "personal" | "business"; kind: string };
}

type Attendee = { name: string; email: string | null; phone: string | null };

function readAttendees(raw: FormDataEntryValue | null): Attendee[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    throw new Error("Lista de convidados inválida.");
  }
  if (!Array.isArray(parsed)) return [];
  if (parsed.length > 50) throw new Error("No máximo 50 convidados por evento.");
  const list: Attendee[] = [];
  for (const item of parsed) {
    const name = String((item as Attendee)?.name ?? "").trim().slice(0, 120);
    const email = String((item as Attendee)?.email ?? "").trim().toLowerCase() || null;
    const phoneDigits = String((item as Attendee)?.phone ?? "").replace(/\D/g, "") || null;
    if (!name && !email && !phoneDigits) continue;
    if (email && (email.length > 200 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) {
      throw new Error(`E-mail inválido: ${email}`);
    }
    if (phoneDigits && !/^\d{10,13}$/.test(phoneDigits)) {
      throw new Error("WhatsApp do convidado deve ter DDD e número (10 a 13 dígitos).");
    }
    list.push({ name: name || email || phoneDigits || "Convidado", email, phone: phoneDigits });
  }
  return list;
}

/** Lê e valida o formulário do evento. Datas locais (fuso de São Paulo) viram UTC aqui. */
function readEvent(formData: FormData) {
  const title = text(formData.get("title"), 200);
  if (!title) throw new Error("Dê um título ao evento.");

  const allDay = formData.get("all_day") === "on" || formData.get("all_day") === "true";
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "") || startDate;
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) throw new Error("Data inválida.");

  let startsAt: string;
  let endsAt: string;
  if (allDay) {
    if (endDate < startDate) throw new Error("O fim não pode ser antes do início.");
    startsAt = localToUtcIso(startDate);
    endsAt = localToUtcIso(addDays(endDate, 1));
  } else {
    const startTime = String(formData.get("start_time") ?? "");
    const endTime = String(formData.get("end_time") ?? "");
    if (!isTime(startTime) || !isTime(endTime)) throw new Error("Horário inválido.");
    startsAt = localToUtcIso(startDate, startTime);
    endsAt = localToUtcIso(endDate, endTime);
    if (endsAt < startsAt) throw new Error("O fim não pode ser antes do início.");
  }

  const meetingUrl = text(formData.get("meeting_url"), 500);
  if (meetingUrl && !/^https:\/\/\S+$/.test(meetingUrl)) {
    throw new Error("O link da reunião precisa começar com https://");
  }

  const color = String(formData.get("color") ?? "");
  const kind = formData.get("kind") === "task" ? "task" : "event";

  return {
    calendarId: String(formData.get("calendar_id") ?? ""),
    row: {
      kind,
      title,
      description: text(formData.get("description"), 5000),
      location: text(formData.get("location"), 300),
      meeting_url: meetingUrl,
      color: isAgendaColor(color) ? color : null,
      all_day: allDay,
      starts_at: startsAt,
      ends_at: endsAt,
    },
    attendees: readAttendees(formData.get("attendees")),
  };
}

async function saveAttendees(db: Db, userId: string, eventId: string, attendees: Attendee[]) {
  const { error: delError } = await db.from("event_attendees").delete().eq("event_id", eventId).eq("user_id", userId);
  if (delError) throw delError;
  if (attendees.length === 0) return;
  const { error } = await db
    .from("event_attendees")
    .insert(attendees.map((a) => ({ ...a, user_id: userId, event_id: eventId })));
  if (error) throw error;
}

export async function createEvent(formData: FormData): Promise<ActionResult> {
  try {
    const { db, userId } = await session();
    const input = readEvent(formData);
    await ownCalendar(db, userId, input.calendarId);
    const { data, error } = await db
      .from("events")
      .insert({ ...input.row, user_id: userId, calendar_id: input.calendarId })
      .select("id")
      .single();
    if (error) throw error;
    await saveAttendees(db, userId, data.id as string, input.attendees);
    return done();
  } catch (error) {
    return fail(error, "Não foi possível salvar o evento.");
  }
}

export async function updateEvent(formData: FormData): Promise<ActionResult> {
  try {
    const { db, userId } = await session();
    const id = String(formData.get("id") ?? "");
    if (!id) throw new Error("Evento não encontrado.");
    const input = readEvent(formData);
    await ownCalendar(db, userId, input.calendarId);
    const { data, error } = await db
      .from("events")
      .update({ ...input.row, calendar_id: input.calendarId })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Evento não encontrado.");
    await saveAttendees(db, userId, id, input.attendees);
    return done();
  } catch (error) {
    return fail(error, "Não foi possível salvar o evento.");
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    const { db, userId } = await session();
    const { error } = await db.from("events").delete().eq("id", id).eq("user_id", userId);
    if (error) throw error;
    return done();
  } catch (error) {
    return fail(error, "Não foi possível excluir o evento.");
  }
}

// ---------- Agendas ----------

export async function saveCalendar(formData: FormData): Promise<ActionResult> {
  try {
    const { db, userId } = await session();
    const id = String(formData.get("id") ?? "");
    const name = text(formData.get("name"), 60);
    if (!name) throw new Error("Dê um nome à agenda.");
    const color = String(formData.get("color") ?? "");
    if (!isAgendaColor(color)) throw new Error("Escolha uma cor.");

    if (id) {
      const { data, error } = await db
        .from("calendars")
        .update({ name, color })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Agenda não encontrada.");
    } else {
      const scope = formData.get("scope") === "business" ? "business" : "personal";
      if (scope === "business" && !(await canUseBusiness())) {
        throw new Error("A agenda da Empresa faz parte do plano com Empresa.");
      }
      const { count, error: countError } = await db
        .from("calendars")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (countError) throw countError;
      if ((count ?? 0) >= 30) throw new Error("Limite de 30 agendas atingido.");
      const { error } = await db
        .from("calendars")
        .insert({ user_id: userId, scope, kind: "custom", name, color, position: (count ?? 0) + 1 });
      if (error) throw error;
    }
    return done();
  } catch (error) {
    return fail(error, "Não foi possível salvar a agenda.");
  }
}

export async function setCalendarVisible(id: string, visible: boolean): Promise<ActionResult> {
  try {
    const { db, userId } = await session();
    const { error } = await db.from("calendars").update({ is_visible: visible }).eq("id", id).eq("user_id", userId);
    if (error) throw error;
    return done();
  } catch (error) {
    return fail(error, "Não foi possível atualizar a agenda.");
  }
}

/** Apaga a agenda e os eventos dela. A financeira e a última agenda do escopo ficam. */
export async function deleteCalendar(id: string): Promise<ActionResult> {
  try {
    const { db, userId } = await session();
    const { data: cal, error } = await db
      .from("calendars")
      .select("id, scope, kind")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!cal) throw new Error("Agenda não encontrada.");
    if (cal.kind !== "custom") throw new Error("A agenda financeira não pode ser excluída, só ocultada.");
    const { count, error: countError } = await db
      .from("calendars")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("scope", cal.scope)
      .eq("kind", "custom");
    if (countError) throw countError;
    if ((count ?? 0) <= 1) throw new Error("Mantenha pelo menos uma agenda neste modo.");
    const { error: delError } = await db.from("calendars").delete().eq("id", id).eq("user_id", userId);
    if (delError) throw delError;
    return done();
  } catch (error) {
    return fail(error, "Não foi possível excluir a agenda.");
  }
}
