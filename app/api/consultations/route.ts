import { randomUUID } from "node:crypto";
import { consultationSchema } from "@/lib/validation";
import { allowSubmission } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendAdminEmail } from "@/lib/notify";
import { sendAdminBookingNotification } from "@/lib/whatsapp";
import { firm } from "@/lib/firm";

export const runtime = "nodejs";

const allowedFiles: Record<string, string[]> = {
  "application/pdf": ["pdf"], "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"],
  "application/msword": ["doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"]
};

export async function POST(request: Request) {
  if (!allowSubmission(request, "consultation", 5)) return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "The submitted form could not be read." }, { status: 400 }); }
  if (String(form.get("website") || "").trim()) return Response.json({ ok: true, booking_reference: "Received" });
  const parsed = consultationSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check the information and try again." }, { status: 400 });
  const values = parsed.data;
  const preferredDate = new Date(`${values.preferred_date}T00:00:00`);
  if (Number.isNaN(preferredDate.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(values.preferred_date)) return Response.json({ error: "Please choose a valid preferred date." }, { status: 400 });
  if (values.preferred_date < new Date().toISOString().slice(0, 10)) return Response.json({ error: "Preferred date cannot be in the past." }, { status: 400 });

  const attachment = form.get("attachment");
  if (attachment && attachment instanceof File && attachment.size) {
    const extension = attachment.name.split(".").pop()?.toLowerCase() || "";
    if (attachment.size > 4 * 1024 * 1024) return Response.json({ error: "The attachment must be no larger than 4 MB." }, { status: 400 });
    if (!allowedFiles[attachment.type]?.includes(extension)) return Response.json({ error: "Please attach a PDF, JPG, PNG, DOC, or DOCX file." }, { status: 400 });
    const signature = new Uint8Array(await attachment.slice(0, 8).arrayBuffer());
    const validSignature = attachment.type === "application/pdf" ? String.fromCharCode(...signature.slice(0, 4)) === "%PDF"
      : attachment.type === "image/jpeg" ? signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      : attachment.type === "image/png" ? signature.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
      : attachment.type === "application/msword" ? signature.slice(0, 4).join(",") === "208,207,17,224"
      : signature[0] === 0x50 && signature[1] === 0x4b;
    if (!validSignature) return Response.json({ error: "The selected file does not match its declared format." }, { status: 400 });
  }

  let supabase;
  try { supabase = createSupabaseAdminClient(); }
  catch { return Response.json({ error: "Online booking is not configured yet. Please contact the office by email." }, { status: 503 }); }
  if (values.case_category !== "Not sure yet") {
    const { data: categories, error: categoryError } = await supabase.from("services").select("title").eq("published", true);
    if (categoryError) return Response.json({ error: "The booking service is temporarily unavailable. Please try again shortly." }, { status: 503 });
    if (!categories?.some((category) => category.title === values.case_category)) return Response.json({ error: "Please select a current service category." }, { status: 400 });
  }

  const id = randomUUID();
  const bookingReference = `${firm.monogram}-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const file = attachment instanceof File && attachment.size ? attachment : null;
  let storagePath: string | null = null;
  if (file) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "file";
    storagePath = `${id}/${randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("consultation-documents").upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) return Response.json({ error: "The document could not be uploaded. Please try again or submit without an attachment." }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("consultations").insert({
    id,
    booking_reference: bookingReference,
    ...values,
    status: "Pending",
    internal_notes: ""
  });
  if (insertError) {
    if (storagePath) await supabase.storage.from("consultation-documents").remove([storagePath]);
    console.error("Consultation insert failed", insertError.message);
    return Response.json({ error: "Your request could not be saved. Please try again in a moment." }, { status: 500 });
  }
  if (file && storagePath) {
    const { error: docError } = await supabase.from("consultation_documents").insert({ consultation_id: id, file_name: file.name.replace(/[\\/\0-\x1f]/g, "").slice(0, 200), storage_path: storagePath, file_type: file.type, file_size: file.size });
    if (docError) {
      await Promise.all([supabase.from("consultations").delete().eq("id", id), supabase.storage.from("consultation-documents").remove([storagePath])]);
      console.error("Consultation document record failed", docError.message);
      return Response.json({ error: "The document could not be attached to your request. Please try again." }, { status: 500 });
    }
  }

  const notification = `${firm.websiteName} (${firm.firmName})\n\nNew consultation request\nReference: ${bookingReference}\nName: ${values.full_name}\nPhone: ${values.phone}\nEmail: ${values.email}\nCategory: ${values.case_category}\nPreferred date: ${values.preferred_date}\nPreferred time: ${values.preferred_time}\nPreferred contact method: ${values.preferred_contact_method}\nCase summary: ${values.message || "No case summary provided."}`;
  const [, whatsappResult] = await Promise.all([
    sendAdminEmail(`Consultation request ${bookingReference}`, notification),
    sendAdminBookingNotification({ ...values, booking_reference: bookingReference })
  ]);

  try {
    const { error: notificationStatusError } = await supabase
      .from("consultations")
      .update({ admin_whatsapp_status: whatsappResult.status })
      .eq("id", id);
    if (notificationStatusError) {
      console.error("Consultation was saved but its WhatsApp notification state could not be recorded.", { code: notificationStatusError.code });
    }
  } catch {
    console.error("Consultation was saved but its WhatsApp notification state could not be recorded.");
  }

  return Response.json({ ok: true, booking_reference: bookingReference, admin_whatsapp_status: whatsappResult.status }, { status: 201 });
}
