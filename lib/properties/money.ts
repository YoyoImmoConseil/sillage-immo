/**
 * Monetary amounts circulate as integer cents inside the price model, because
 * summing euros as floats drifts: `8.11 + 2.02` is `10.129999999999999` in
 * IEEE-754. Conversion back to euros happens at formatting time only.
 */

export const toCents = (value: number | null | undefined): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100);
};

export const fromCents = (cents: number) => cents / 100;

/** Keeps a monetary value only when it is strictly positive. */
export const positiveCents = (cents: number | null): number | null => {
  return typeof cents === "number" && cents > 0 ? cents : null;
};

export const sumCents = (values: Array<number | null>): number | null => {
  const parts = values.filter((value): value is number => typeof value === "number");
  if (parts.length === 0) return null;
  return parts.reduce((total, value) => total + value, 0);
};
