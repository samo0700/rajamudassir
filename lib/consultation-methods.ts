export const consultationMethods = [
  "Office Visit",
  "Phone Consultation",
  "Meeting at Another Location"
] as const;

// Keep older requests and cached forms compatible without changing their consent.
export const legacyContactMethods = ["Phone", "WhatsApp", "Email"] as const;

export function isConsultationMethod(value: string): boolean {
  return consultationMethods.some((method) => method === value);
}
