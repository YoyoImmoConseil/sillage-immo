import "server-only";

type Bucket = {
  count: number;
  expiresAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number };

type CheckInput = {
  key: string;
  limit: number;
  windowMs: number;
};

const purgeIfExpired = (key: string, now: number) => {
  const bucket = buckets.get(key);
  if (!bucket) return null;
  if (bucket.expiresAt <= now) {
    buckets.delete(key);
    return null;
  }
  return bucket;
};

export const checkRateLimit = ({ key, limit, windowMs }: CheckInput): RateLimitResult => {
  const now = Date.now();
  const bucket = purgeIfExpired(key, now);

  if (!bucket) {
    const expiresAt = now + windowMs;
    buckets.set(key, { count: 1, expiresAt });
    return { ok: true, remaining: Math.max(limit - 1, 0), resetAt: expiresAt };
  }

  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.expiresAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.max(limit - bucket.count, 0), resetAt: bucket.expiresAt };
};

export const extractClientIp = (headers: Headers, fallback = "unknown") => {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return fallback;
};
