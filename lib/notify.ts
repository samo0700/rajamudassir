import "server-only";

type NotifyResult = { sent: boolean; reason?: string };

export async function sendAdminEmail(subject: string, text: string): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.NOTIFICATION_FROM_EMAIL;
  if (!key || !to || !from) return { sent: false, reason: "Email notifications are not configured." };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    return response.ok ? { sent: true } : { sent: false, reason: `Email delivery was not accepted (${response.status}).` };
  } catch {
    return { sent: false, reason: "Email notification service is temporarily unavailable." };
  }
}
