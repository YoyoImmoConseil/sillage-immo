import { describe, expect, it } from "vitest";
import {
  parseSweepBrightZapierDate,
  parseSweepBrightZapierDateToIso,
} from "@/lib/sweepbright/zapier-date";

describe("parseSweepBrightZapierDate", () => {
  it("parses the canonical Zapier sample", () => {
    const date = parseSweepBrightZapierDate("Monday, 23-Feb-26 13:00:00 UTC");
    expect(date).toBeInstanceOf(Date);
    expect(date?.toISOString()).toBe("2026-02-23T13:00:00.000Z");
  });

  it("parses a 1-digit day", () => {
    const date = parseSweepBrightZapierDate("Tuesday, 5-May-26 09:30:15 UTC");
    expect(date?.toISOString()).toBe("2026-05-05T09:30:15.000Z");
  });

  it("tolerates surrounding whitespace", () => {
    const date = parseSweepBrightZapierDate(
      "  Monday, 23-Feb-26 13:00:00 UTC  "
    );
    expect(date?.toISOString()).toBe("2026-02-23T13:00:00.000Z");
  });

  it("returns null for an empty string", () => {
    expect(parseSweepBrightZapierDate("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(parseSweepBrightZapierDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(parseSweepBrightZapierDate(undefined)).toBeNull();
  });

  it("returns null when the format is wrong (ISO 8601)", () => {
    expect(parseSweepBrightZapierDate("2026-02-23T13:00:00Z")).toBeNull();
  });

  it("returns null for an unknown month abbreviation", () => {
    expect(
      parseSweepBrightZapierDate("Monday, 23-XYZ-26 13:00:00 UTC")
    ).toBeNull();
  });

  it("returns null for impossible day numbers", () => {
    expect(
      parseSweepBrightZapierDate("Friday, 31-Feb-26 13:00:00 UTC")
    ).toBeNull();
  });

  it("returns null for impossible time", () => {
    expect(
      parseSweepBrightZapierDate("Monday, 23-Feb-26 25:00:00 UTC")
    ).toBeNull();
  });

  it("returns null for non-UTC zones", () => {
    expect(
      parseSweepBrightZapierDate("Monday, 23-Feb-26 13:00:00 CET")
    ).toBeNull();
  });

  it("does not coerce 2-digit years to the 1900s", () => {
    const date = parseSweepBrightZapierDate("Monday, 23-Feb-50 13:00:00 UTC");
    expect(date?.getUTCFullYear()).toBe(2050);
  });
});

describe("parseSweepBrightZapierDateToIso", () => {
  it("returns the ISO string for valid input", () => {
    expect(
      parseSweepBrightZapierDateToIso("Monday, 23-Feb-26 13:00:00 UTC")
    ).toBe("2026-02-23T13:00:00.000Z");
  });

  it("returns null for invalid input", () => {
    expect(parseSweepBrightZapierDateToIso("not a date")).toBeNull();
  });
});
