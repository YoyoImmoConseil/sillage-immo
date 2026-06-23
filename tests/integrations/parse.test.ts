import { describe, expect, it } from "vitest";
import { isoDateString, moneyAmount } from "@/lib/integrations/parse";

describe("isoDateString", () => {
  it("normalizes a valid ISO string to ISO", () => {
    const result = isoDateString.safeParse("2026-06-23T10:00:00.000Z");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("2026-06-23T10:00:00.000Z");
  });

  it("accepts a date-only string and expands it to ISO", () => {
    const result = isoDateString.safeParse("2026-06-23");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.startsWith("2026-06-23")).toBe(true);
  });

  it("rejects an unparseable string", () => {
    const result = isoDateString.safeParse("pas une date");
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isoDateString.safeParse("").success).toBe(false);
  });
});

describe("moneyAmount", () => {
  it("coerces a numeric string", () => {
    const result = moneyAmount.safeParse("12500");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(12500);
  });

  it("accepts a number", () => {
    expect(moneyAmount.safeParse(9000).success).toBe(true);
  });

  it("rejects a negative amount", () => {
    expect(moneyAmount.safeParse(-1).success).toBe(false);
  });

  it("rejects a non-numeric string", () => {
    expect(moneyAmount.safeParse("abc").success).toBe(false);
  });
});
