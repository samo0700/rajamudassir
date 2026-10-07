/** WhatsApp recipients use international digits, without a leading plus. */
export function normalizePakistaniPhoneNumber(value: string): string | null {
  const input = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(input)) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("03")) digits = `92${digits.slice(1)}`;
  else if (digits.length === 10 && digits.startsWith("3")) digits = `92${digits}`;

  if (digits.startsWith("92")) return /^923\d{9}$/.test(digits) ? digits : null;
  return input.startsWith("+") && /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
