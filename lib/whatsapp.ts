import "server-only";

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
};

/** Return a WhatsApp Cloud API recipient in digits-only international format. */
export function normalizePakistaniPhoneNumber(value: string): string | null {
  const input = value.trim();
  let digits = input.replace(/\D/g, "");

  if (digits.startsWith("0092")) {
    digits = `92${digits.slice(4)}`;
  } else if (digits.startsWith("92")) {
    // Already in Pakistan's international format.
  } else if (digits.startsWith("0")) {
    const national = digits.slice(1);
    if (national.length !== 10 || !national.startsWith("3")) return null;
    digits = `92${national}`;
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = `92${digits}`;
  } else if (input.startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    // Preserve other explicit E.164 numbers as-is.
  } else {
    return null;
  }

  if (digits.startsWith("92") && digits.length === 12 && digits[2] === "3") return digits;
  if (input.startsWith("+") && digits.length >= 8 && digits.length <= 15) return digits;
  return null;
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
    booking.preferred_date,
    booking.preferred_time,
    "Raja Mudassir Advocate"
  ]);
}

export function sendClientCancellation(booking: ClientNotice): Promise<WhatsAppNotificationResult> {
  return sendConfiguredTemplate(booking.phone, "WHATSAPP_TEMPLATE_CLIENT_CANCELLATION", [
    booking.booking_reference,
    "Cancelled",
    booking.preferred_date,
    booking.preferred_time,
    "Raja Mudassir Advocate"
  ]);
}

export function sendAdminContactNotification(recipient: string, message: string): Promise<WhatsAppNotificationResult> {
  return sendConfiguredTemplate(recipient, "WHATSAPP_TEMPLATE_CONTACT_NOTIFICATION", [message]);
}
