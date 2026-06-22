import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: {} }));

import { computePricePerM2 } from "@/services/market/market-observation.service";

describe("computePricePerM2", () => {
  it("derives a rounded €/m² from price and area", () => {
    expect(computePricePerM2(500000, 80)).toBe(6250);
    expect(computePricePerM2(330000, 33)).toBe(10000);
  });

  it("rounds to the nearest euro", () => {
    expect(computePricePerM2(100000, 33)).toBe(3030);
  });

  it("returns null for missing or non-sensical inputs", () => {
    expect(computePricePerM2(null, 80)).toBeNull();
    expect(computePricePerM2(500000, null)).toBeNull();
    expect(computePricePerM2(0, 80)).toBeNull();
    expect(computePricePerM2(500000, 0)).toBeNull();
    expect(computePricePerM2(-100, 80)).toBeNull();
    expect(computePricePerM2(Number.NaN, 80)).toBeNull();
  });
});
