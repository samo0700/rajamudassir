import "server-only";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function allowSubmission(request: Request, namespace: string, limit = 5, windowMs = 60 * 60 * 1000) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${namespace}:${address}`;
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  if (attempts.size > 5000) for (const [item, value] of attempts) if (value.resetAt < now) attempts.delete(item);
  return true;
}
