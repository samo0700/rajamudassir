import { contactSchema } from "@/lib/validation";
import { allowSubmission } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendAdminEmail } from "@/lib/notify";
import { sendAdminContactNotification } from "@/lib/whatsapp";

export async function POST(request: Request) {
  if (!allowSubmission(request, "contact", 5)) return Response.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "The submitted form could not be read." }, { status: 400 }); }
  if (String(form.get("website") || "").trim()) return Response.json({ ok: true }, { status: 201 });
  const parsed = contactSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Please check the information and try again." }, { status: 400 });
  let supabase;
  try { supabase = createSupabaseAdminClient(); }
  catch { return Response.json({ error: "The contact form is not configured yet. Please email the office directly." }, { status: 503 }); }
  const { error } = await supabase.from("contact_messages").insert({ ...parsed.data, read_status: false });
  if (error) {
    console.error("Contact message insert failed", error.message);
    return Response.json({ error: "Your message could not be saved. Please try again shortly." }, { status: 500 });
  }
  const notification = `New website inquiry\nName: ${parsed.data.name}\nPhone: ${parsed.data.phone}\nEmail: ${parsed.data.email}\nSubject: ${parsed.data.subject}\nMessage: ${parsed.data.message}`;
  const [emailResult, whatsappResult] = await Promise.all([
    sendAdminEmail(`Website inquiry: ${parsed.data.subject}`, notification),
    sendAdminContactNotification(process.env.ADMIN_WHATSAPP || "", notification)
  ]);
  if (!emailResult.sent && whatsappResult.status !== "sent") console.info("Contact message saved; external admin notification channels are not configured.");
  return Response.json({ ok: true }, { status: 201 });
}
