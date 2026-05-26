// Anonymous session cookie used to correlate AI conversation turns
// coming from visitors who are not (yet) authenticated.
//
// Wire format (cookie value): `<uuid>.<base64url-hmac>` where:
//   - `<uuid>`  is a stable v4 UUID per browser, generated on first hit.
//   - `<hmac>`  is HMAC-SHA-256(uuid, SILLAGE_AI_SESSION_SECRET) so the
//               server can reject tampered cookies cheaply at edge
//               runtime without a DB lookup.
//
// The cookie is httpOnly, SameSite=Lax, 90 days. We keep the secret
// optional to avoid breaking local dev: if absent, we sign with a
// deterministic fallback (clearly marked "dev-only") and warn once on
// boot. Production deployments MUST set SILLAGE_AI_SESSION_SECRET.
//
// Read from anywhere (server actions, route handlers, middleware) via
// `getAnonymousSessionId(request)` or `parseAnonymousSessionCookie`.

const COOKIE_NAME = "sillage_ai_session";
const COOKIE_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;
const SECRET_ENV_KEY = "SILLAGE_AI_SESSION_SECRET";
const DEV_FALLBACK_SECRET =
  "dev-only-anonymous-session-secret-do-not-use-in-prod";

let warnedAboutDevSecret = false;

const resolveSecret = () => {
  const fromEnv = process.env[SECRET_ENV_KEY];
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (!warnedAboutDevSecret) {
    warnedAboutDevSecret = true;
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[anonymous-session] ${SECRET_ENV_KEY} is missing or too short in production — anonymous cookies will use the dev fallback. Set it to a 32+ character random string.`
      );
    }
  }
  return DEV_FALLBACK_SECRET;
};

const toBase64Url = (bytes: ArrayBuffer): string => {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(binary, "binary").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const hmacSha256 = async (message: string, secret: string): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return toBase64Url(signature);
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isLikelyUuid = (value: string): boolean => UUID_RE.test(value);

export const buildAnonymousSessionCookieValue = async (
  uuid: string
): Promise<string> => {
  if (!isLikelyUuid(uuid)) {
    throw new Error(
      "buildAnonymousSessionCookieValue expects a v1-5 UUID string."
    );
  }
  const signature = await hmacSha256(uuid, resolveSecret());
  return `${uuid}.${signature}`;
};

export type AnonymousSession = {
  id: string;
  raw: string;
};

export const parseAnonymousSessionCookie = async (
  cookieValue: string | undefined | null
): Promise<AnonymousSession | null> => {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const [uuid, signature] = cookieValue.split(".");
  if (!uuid || !signature) return null;
  if (!isLikelyUuid(uuid)) return null;

  const expected = await hmacSha256(uuid, resolveSecret());
  if (expected.length !== signature.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  return { id: uuid, raw: cookieValue };
};

export const generateAnonymousSessionUuid = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const ANONYMOUS_SESSION_COOKIE_NAME = COOKIE_NAME;
export const ANONYMOUS_SESSION_COOKIE_MAX_AGE_SECONDS = COOKIE_MAX_AGE_SECONDS;

export type AnonymousSessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  maxAge: number;
  secure?: boolean;
};

export const buildAnonymousSessionCookieOptions = (
  isProduction = process.env.NODE_ENV === "production"
): AnonymousSessionCookieOptions => ({
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
  secure: isProduction,
});

export const OPT_OUT_COOKIE_NAME = "sillage_ai_optout";
