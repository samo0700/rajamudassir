import "server-only";
import { firm } from "@/lib/firm";
import { normalizePakistaniPhoneNumber } from "@/lib/phone";
export { normalizePakistaniPhoneNumber } from "@/lib/phone";

export type WhatsAppNotificationStatus = "sent" | "failed" | "not_configured";
export type WhatsAppNotificationResult = { status: WhatsAppNotificationStatus };

type WhatsAppTemplate = {
  name: string;
  language: string;
  parameters: string[];
};

type BookingNotice = {
  booking_reference: string;
  full_name: string;
  phone: string;
  email: string;
  case_category: string;
  preferred_date: string;
  preferred_time: string;
  preferred_contact_method: string;
  message?: string | null;
};

type ClientNotice = Pick<BookingNotice, "booking_reference" | "preferred_date" | "preferred_time"> & {
  phone: string;
  preferred_contact_method?: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  appointment_location?: string | null;
};

export function clientHasWhatsAppConsent(booking: { whatsapp_opt_in?: boolean; preferred_contact_method: string }): boolean {
  return booking.whatsapp_opt_in ?? booking.preferred_contact_method === "WhatsApp";
}

function clientAppointmentDetails(booking: ClientNotice): string[] {
  const method = booking.preferred_contact_method || "Office Visit";
  const venue = method === "Phone Consultation" || method === "Phone"
    ? "Our office will call your booking phone number."
    : booking.appointment_location?.trim() || (method === "Office Visit" ? `${firm.address}, ${firm.city}` : "Please contact our office for meeting details.");
  return [
    booking.appointment_date || booking.preferred_date,
    booking.appointment_time ? `${booking.appointment_time.slice(0, 5)} PKT` : booking.preferred_time,
    `${firm.websiteName} (${firm.firmName}). ${method}. ${venue}`
  ];
}

function templateFromEnvironment(variable: string, parameters: string[]): WhatsAppTemplate | undefined {
  const name = process.env[variable]?.trim();
  if (!name) return undefined;
  return {
    name,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "en_US",
    parameters
  };
}

function sendConfiguredTemplate(
  recipient: string,
  variable: string,
  parameters: string[]
): Promise<WhatsAppNotificationResult> {
  const template = templateFromEnvironment(variable, parameters);
  if (!template) return Promise.resolve({ status: "not_configured" });
  return sendWhatsAppMessage(recipient, "", template);
}

function safeMetaError(body: unknown) {
  if (!body || typeof body !== "object" || !("error" in body)) return {};
  const error = (body as { error?: Record<string, unknown> }).error;
  if (!error || typeof error !== "object") return {};
  return {
    ...(typeof error.code === "number" ? { code: error.code } : {}),
    ...(typeof error.error_subcode === "number" ? { subcode: error.error_subcode } : {}),
    ...(typeof error.type === "string" ? { type: error.type.slice(0, 80) } : {})
  };
}

/** Sends text only when the caller knows the customer-service window is open; use templates for proactive sends. */
export async function sendWhatsAppMessage(
  recipient: string,
  message: string,
  template?: WhatsAppTemplate
): Promise<WhatsAppNotificationResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim();
  if (!token || !phoneNumberId || !version || !recipient.trim()) return { status: "not_configured" };

  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phoneNumberId)) {
    console.error("[whatsapp] configuration is invalid; check Graph API version and phone number ID format.");
    return { status: "failed" };
  }

  const to = normalizePakistaniPhoneNumber(recipient);
  if (!to) {
    console.error("[whatsapp] notification not sent because the recipient phone number is invalid.");
    return { status: "failed" };
  }

  const body = template
    ? {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: template.name,
          language: { code: template.language },
          components: [{
            type: "body",
            parameters: template.parameters.map((text) => ({ type: "text", text }))
          }]
        }
      }
    : {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message }
      };

  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      const apiBody = await response.json().catch(() => null);
      console.error("[whatsapp] Meta rejected a message.", { httpStatus: response.status, ...safeMetaError(apiBody) });
      return { status: "failed" };
    }
    return { status: "sent" };
  } catch (error) {
    // Keep logs useful without recording message text, recipient, credentials, or raw network errors.
    console.error("[whatsapp] Meta request failed.", { errorName: error instanceof Error ? error.name : "UnknownError" });
    return { status: "failed" };
  }
}

export function sendAdminBookingNotification(booking: BookingNotice): Promise<WhatsAppNotificationResult> {
  const rawSummary = booking.message?.trim().replace(/\s+/g, " ") || "No case summary provided.";
  const summary = rawSummary.length > 800 ? `${rawSummary.slice(0, 797)}...` : rawSummary;
  return sendConfiguredTemplate(process.env.ADMIN_WHATSAPP || "", "WHATSAPP_TEMPLATE_ADMIN_BOOKING", [
    booking.booking_reference,
    booking.full_name,
    booking.phone,
    booking.email,
    booking.case_category,
    booking.preferred_date,
    booking.preferred_time,
    booking.preferred_contact_method,
    summary
  ]);
}

export function sendClientConfirmation(booking: ClientNotice): Promise<WhatsAppNotificationResult> {
  return sendConfiguredTemplate(booking.phone, "WHATSAPP_TEMPLATE_CLIENT_CONFIRMATION", [
    booking.booking_reference,
    "Confirmed",
    ...clientAppointmentDetails(booking)
  ]);
}

export function sendClientCancellation(booking: ClientNotice): Promise<WhatsAppNotificationResult> {
  return sendConfiguredTemplate(booking.phone, "WHATSAPP_TEMPLATE_CLIENT_CANCELLATION", [
    booking.booking_reference,
    "Cancelled",
    ...clientAppointmentDetails(booking)
  ]);
}

export function sendAdminContactNotification(recipient: string, message: string): Promise<WhatsAppNotificationResult> {
  return sendConfiguredTemplate(recipient, "WHATSAPP_TEMPLATE_CONTACT_NOTIFICATION", [message]);
}
