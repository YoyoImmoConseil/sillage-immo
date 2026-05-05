import { describe, expect, it } from "vitest";
import { computeContactInitials } from "@/lib/sweepbright/contact-initials";

describe("computeContactInitials", () => {
  it("returns the dash placeholder for null", () => {
    expect(computeContactInitials(null)).toBe("—");
  });

  it("returns the dash placeholder for undefined", () => {
    expect(computeContactInitials(undefined)).toBe("—");
  });

  it("returns the dash placeholder for the empty string", () => {
    expect(computeContactInitials("")).toBe("—");
  });

  it("returns the dash placeholder for whitespace-only input", () => {
    expect(computeContactInitials("   \t  ")).toBe("—");
  });

  it("uppercases the initials of a two-word name", () => {
    expect(computeContactInitials("Claire Caisson")).toBe("CC");
  });

  it("uppercases when the input is fully lowercase", () => {
    expect(computeContactInitials("claire caisson")).toBe("CC");
  });

  it("treats hyphenated first names as a single first word", () => {
    // First word = "Jean-Pierre", last word = "Dupont" => J + D
    expect(computeContactInitials("Jean-Pierre Dupont")).toBe("JD");
  });

  it("uses first + last word for multi-word names, ignoring middle parts", () => {
    expect(computeContactInitials("Marie Anne Caisson Dubois")).toBe("MD");
  });

  it("preserves accented characters", () => {
    expect(computeContactInitials("Élise Étienne")).toBe("ÉÉ");
  });

  it("returns a single initial for single-word names", () => {
    expect(computeContactInitials("Claire")).toBe("C");
  });

  it("collapses repeated whitespace between words", () => {
    expect(computeContactInitials("  Claire    Caisson  ")).toBe("CC");
  });

  it("handles names with tabs as separators", () => {
    expect(computeContactInitials("Claire\tCaisson")).toBe("CC");
  });
});
