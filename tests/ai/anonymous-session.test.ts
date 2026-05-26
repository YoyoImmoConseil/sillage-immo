import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildAnonymousSessionCookieValue,
  generateAnonymousSessionUuid,
  parseAnonymousSessionCookie,
} from "@/lib/ai/anonymous-session";

const ORIGINAL_SECRET = process.env.SILLAGE_AI_SESSION_SECRET;

beforeAll(() => {
  process.env.SILLAGE_AI_SESSION_SECRET =
    "test-secret-32-chars-or-more-please-foo-bar-baz";
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.SILLAGE_AI_SESSION_SECRET;
  } else {
    process.env.SILLAGE_AI_SESSION_SECRET = ORIGINAL_SECRET;
  }
});

describe("anonymous session cookie", () => {
  it("round-trips a freshly signed UUID", async () => {
    const uuid = generateAnonymousSessionUuid();
    const cookieValue = await buildAnonymousSessionCookieValue(uuid);
    const parsed = await parseAnonymousSessionCookie(cookieValue);
    expect(parsed?.id).toBe(uuid);
  });

  it("rejects a tampered signature", async () => {
    const uuid = generateAnonymousSessionUuid();
    const cookieValue = await buildAnonymousSessionCookieValue(uuid);
    const [u, sig] = cookieValue.split(".");
    // Flip one character of the signature.
    const tampered = `${u}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
    const parsed = await parseAnonymousSessionCookie(tampered);
    expect(parsed).toBeNull();
  });

  it("rejects a UUID with the wrong shape", async () => {
    const result = await parseAnonymousSessionCookie("notauuid.signature");
    expect(result).toBeNull();
  });

  it("rejects an empty / undefined cookie value", async () => {
    expect(await parseAnonymousSessionCookie(undefined)).toBeNull();
    expect(await parseAnonymousSessionCookie("")).toBeNull();
    expect(await parseAnonymousSessionCookie(null)).toBeNull();
  });

  it("buildAnonymousSessionCookieValue throws on invalid UUID", async () => {
    await expect(
      buildAnonymousSessionCookieValue("not-a-uuid")
    ).rejects.toThrow();
  });

  it("generateAnonymousSessionUuid returns v4-shaped strings", () => {
    for (let i = 0; i < 10; i += 1) {
      const uuid = generateAnonymousSessionUuid();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }
  });
});
