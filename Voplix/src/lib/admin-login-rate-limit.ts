type Bucket = { count: number; resetAt: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
const buckets = new Map<string, Bucket>();

export function isAdminLoginRateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || now > b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > MAX_ATTEMPTS;
}
