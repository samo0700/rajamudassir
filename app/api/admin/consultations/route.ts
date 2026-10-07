import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdminApi } from "@/lib/admin-auth";
import { consultationSchema } from "@/lib/validation";
import { isValidConsultationDate, todayInPakistan } from "@/lib/consultation-date";
import { firm } from "@/lib/firm";
import { clientHasWhatsAppConsent, sendAdminBookingNotification, sendClientCancellation, sendClientConfirmation, type WhatsAppNotificationResult } from "@/lib/whatsapp";
import type { Consultation } from "@/lib/types";

export const runtime = "nodejs";
const appointmentFields = {
  appointment_date: z.string().refine(isValidConsultationDate, "Choose a valid appointment date.").optional(),
  appointment_time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Choose an appointment time.").optional(),
  appointment_location: z.string().trim().max(300).optional()
};
type ClientNotification = WhatsAppNotificationResult | { status: "not_requested" };

function appointmentError(booking: Pick<Consultation, "preferred_contact_method" | "appointment_date" | "appointment_time" | "appointment_location">): string | null {
  if (!booking.appointment_date || !booking.appointment_time) return "Choose the appointment date and exact time before confirming.";
  if (booking.appointment_date < todayInPakistan()) return "The appointment date cannot be in the past.";
  if (booking.preferred_contact_method === "Meeting at Another Location" && !booking.appointment_location?.trim()) return "Enter the agreed meeting location before confirming.";
  return null;
}

async function notifyClient(booking: Consultation): Promise<ClientNotification> {
  if (!clientHasWhatsAppConsent(booking)) return { status: "not_requested" };
  return booking.status === "Cancelled" ? sendClientCancellation(booking) : sendClientConfirmation(booking);
}

async function recordNotification(supabase: SupabaseClient, booking: Consultation, column: "admin_whatsapp_status" | "client_whatsapp_status", notification: ClientNotification) {
  try {
    let query = supabase.from("consultations").update({ [column]: notification.status }).eq("id", booking.id).eq("status", booking.status);
    if (column === "client_whatsapp_status") {
      for (const field of ["appointment_date", "appointment_time", "appointment_location"] as const) {
        query = booking[field] == null ? query.is(field, null) : query.eq(field, booking[field]);
      }
      if (typeof booking.whatsapp_opt_in === "boolean") query = query.eq("whatsapp_opt_in", booking.whatsapp_opt_in);
    }
    const { error } = await query;
    if (error) console.error("Consultation saved but WhatsApp notification status could not be recorded.", { code: error.code });
  } catch { console.error("Consultation saved but WhatsApp notification status could not be recorded."); }
}

export async function GET() {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("consultations").select("*, consultation_documents(id,file_name,file_size,file_type)").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Could not load consultations." }, { status: 500 });
  return Response.json(data);
}

const createSchema = consultationSchema.safeExtend({ status: z.enum(["Pending", "Confirmed"]).default("Confirmed"), ...appointmentFields });

/** Record a consultation received in person or by phone. */
export async function POST(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Check the consultation details." }, { status: 400 });
  const values = parsed.data;
  if (values.preferred_date < todayInPakistan()) return Response.json({ error: "Preferred date cannot be in the past." }, { status: 400 });
  if (values.status === "Confirmed") {
    const error = appointmentError(values);
    if (error) return Response.json({ error }, { status: 400 });
  }
  if (values.case_category !== "Not sure yet") {
    const { data: services, error } = await auth.supabase.from("services").select("title").eq("published", true);
    if (error) return Response.json({ error: "Could not load service categories." }, { status: 503 });
    if (!services?.some((service) => service.title === values.case_category)) return Response.json({ error: "Select a current service category." }, { status: 400 });
  }
  const optedIn = values.whatsapp_opt_in ?? values.preferred_contact_method === "WhatsApp";
  const { data, error } = await auth.supabase.from("consultations").insert({
    ...values, id: randomUUID(), booking_reference: `${firm.monogram}-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`,
    whatsapp_opt_in: optedIn, whatsapp_opt_in_at: optedIn ? new Date().toISOString() : null, internal_notes: "",
    admin_whatsapp_status: "not_configured", client_whatsapp_status: "not_requested"
  }).select().single();
  if (error || !data) return Response.json({ error: "Could not save the consultation. Check the database migrations." }, { status: 500 });
  const notification = values.status === "Confirmed" ? await notifyClient(data) : null;
  if (notification) await recordNotification(auth.supabase, data, "client_whatsapp_status", notification);
  return Response.json({ consultation: { ...data, ...(notification ? { client_whatsapp_status: notification.status } : {}) }, notification }, { status: 201 });
}

const schema = z.object({
  id: z.string().uuid(), status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]).optional(),
  internal_notes: z.string().trim().max(5000).optional(), whatsapp_opt_in: z.literal(false).optional(),
  retry_whatsapp: z.enum(["admin", "client"]).optional(), ...appointmentFields
}).refine((value) => Object.keys(value).some((key) => key !== "id"), "Choose an appointment update.");
export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null); const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the appointment update." }, { status: 400 });
  const { id, retry_whatsapp, ...changes } = parsed.data;
  const { data: current, error: currentError } = await auth.supabase.from("consultations").select("*").eq("id", id).maybeSingle();
  if (currentError) return Response.json({ error: "Could not load the consultation." }, { status: 500 });
  if (!current) return Response.json({ error: "Consultation not found." }, { status: 404 });

  if (retry_whatsapp) {
    if (Object.keys(changes).length) return Response.json({ error: "Save appointment changes before retrying a notification." }, { status: 400 });
    const column = retry_whatsapp === "admin" ? "admin_whatsapp_status" : "client_whatsapp_status";
    if (retry_whatsapp === "client" && !["Confirmed", "Cancelled"].includes(current.status)) return Response.json({ error: "Confirm or cancel the appointment before notifying the client." }, { status: 400 });
    if (retry_whatsapp === "client" && !clientHasWhatsAppConsent(current)) return Response.json({ error: "This client has not agreed to WhatsApp updates." }, { status: 400 });
    if (!["failed", "not_configured"].includes(current[column])) return Response.json({ error: "This notification has already been accepted or is being sent. Refresh the dashboard." }, { status: 409 });
    const { data: claimed, error } = await auth.supabase.from("consultations").update({ [column]: "pending" }).eq("id", id).eq("status", current.status).eq(column, current[column]).select().maybeSingle();
    if (error) return Response.json({ error: "Could not retry the notification." }, { status: 500 });
    if (!claimed) return Response.json({ error: "Another update is in progress. Refresh the dashboard." }, { status: 409 });
    const notification = retry_whatsapp === "admin" ? await sendAdminBookingNotification(current) : await notifyClient(current);
    await recordNotification(auth.supabase, current, column, notification);
    return Response.json({ consultation: { ...current, [column]: notification.status }, notification });
  }

  const statusChanged = changes.status !== undefined && changes.status !== current.status;
  const appointmentChanged = (Object.keys(appointmentFields) as (keyof typeof appointmentFields)[]).some((field) => {
    if (changes[field] === undefined) return false;
    const original = field === "appointment_time" ? current[field]?.slice(0, 5) : current[field];
    return changes[field] !== (original || "");
  });
  const next = { ...current, ...changes };
  const shouldNotifyClient = (statusChanged && ["Confirmed", "Cancelled"].includes(next.status)) || (appointmentChanged && next.status === "Confirmed");
  if (next.status === "Confirmed" && (statusChanged || appointmentChanged)) {
    const error = appointmentError(next);
    if (error) return Response.json({ error }, { status: 400 });
  }
  const saveChanges = {
    ...changes,
    ...(shouldNotifyClient ? { client_whatsapp_status: clientHasWhatsAppConsent(next) ? "pending" : "not_requested" } : {}),
    ...(changes.whatsapp_opt_in === false ? { whatsapp_opt_in_at: null, client_whatsapp_status: "not_requested" } : {})
  };
  let query = auth.supabase.from("consultations").update(saveChanges).eq("id", id);
  if (statusChanged || appointmentChanged) query = query.eq("status", current.status);
  if (appointmentChanged) {
    for (const field of Object.keys(appointmentFields)) query = current[field] == null ? query.is(field, null) : query.eq(field, current[field]);
  }
  const { data, error } = await query.select().maybeSingle();
  if (error) return Response.json({ error: "Could not update the consultation." }, { status: 400 });
  if (!data) return Response.json({ error: "The consultation changed while you were editing it. Refresh and try again." }, { status: 409 });

  const notification = shouldNotifyClient ? await notifyClient(data) : null;
  if (notification) await recordNotification(auth.supabase, data, "client_whatsapp_status", notification);

  return Response.json({ consultation: { ...data, ...(notification ? { client_whatsapp_status: notification.status } : {}) }, notification });
}
