import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { sendClientCancellation, sendClientConfirmation } from "@/lib/whatsapp";

export async function GET() {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("consultations").select("*, consultation_documents(id,file_name,file_size,file_type)").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Could not load consultations." }, { status: 500 });
  return Response.json(data);
}

const schema = z.object({ id: z.string().uuid(), status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]).optional(), internal_notes: z.string().trim().max(5000).optional() }).refine((value) => value.status !== undefined || value.internal_notes !== undefined);
export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null); const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the appointment update." }, { status: 400 });
  const { id, ...changes } = parsed.data;
  const { data: current, error: currentError } = await auth.supabase.from("consultations").select("*").eq("id", id).maybeSingle();
  if (currentError || !current) return Response.json({ error: "Consultation not found." }, { status: 404 });

  const statusChanged = changes.status !== undefined && changes.status !== current.status;
  const shouldNotifyClient = statusChanged && (changes.status === "Confirmed" || changes.status === "Cancelled");
  const { data, error } = await auth.supabase.from("consultations").update(changes).eq("id", id).select().single();
  if (error) return Response.json({ error: "Could not update the consultation." }, { status: 400 });

  let notification: { status: "sent" | "failed" | "not_configured" | "not_requested" } | null = null;
  if (shouldNotifyClient && current.preferred_contact_method !== "WhatsApp") {
    notification = { status: "not_requested" };
  } else if (shouldNotifyClient && data.status === "Confirmed") {
    notification = await sendClientConfirmation(data);
  } else if (shouldNotifyClient && data.status === "Cancelled") {
    notification = await sendClientCancellation(data);
  }

  if (notification) {
    try {
      const { error: notificationStatusError } = await auth.supabase
        .from("consultations")
        .update({ client_whatsapp_status: notification.status })
        .eq("id", id);
      if (notificationStatusError) {
        console.error("Consultation status was saved but its WhatsApp notification state could not be recorded.", { code: notificationStatusError.code });
      }
    } catch {
      console.error("Consultation status was saved but its WhatsApp notification state could not be recorded.");
    }
  }

  return Response.json({ consultation: { ...data, ...(notification ? { client_whatsapp_status: notification.status } : {}) }, notification });
}
