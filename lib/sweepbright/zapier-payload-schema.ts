import { z } from "zod";

/**
 * Zod schema for the SweepBright → Zapier → Sillage webhook body.
 *
 * Two real-world quirks of Zapier's "Webhooks by Zapier (POST)" action that
 * this schema must absorb defensively:
 *
 *  1. Zapier serialises **empty trigger fields as `""` (empty string)** rather
 *     than `null`, even when the Zap body literally maps the value to `null`.
 *     Captured live on 7 May 2026 against the `lead_reaction_changed` trigger
 *     for fields like `negotiator.id`, `scheduled_at`, `feedback.rating`, ...
 *
 *  2. Numeric fields surfaced by SweepBright sometimes arrive as **stringified
 *     numbers** (e.g. an `offer_amount` typed in the SweepBright UI may travel
 *     as the string "150000"). We coerce best-effort and fall back to `null`
 *     when the string is empty or unparseable.
 *
 * The validation layer therefore normalises *before* type-checking, so callers
 * downstream see a clean `string | null` / `number | null` shape regardless of
 * what Zapier actually serialised.
 */

const isBlankString = (value: unknown): boolean =>
  typeof value === "string" && value.trim() === "";

const emptyStringToNull = (value: unknown): unknown =>
  isBlankString(value) ? null : value;

const stringNumberToNumber = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const nullableStringField = z
  .preprocess(emptyStringToNull, z.string().nullable())
  .optional()
  .default(null);

export const nullableNumberField = z
  .preprocess((value) => {
    const normalized = emptyStringToNull(value);
    if (normalized === null || normalized === undefined) return null;
    if (typeof normalized === "number") return normalized;
    return stringNumberToNumber(normalized);
  }, z.number().nullable())
  .optional()
  .default(null);

export const nullableRatingField = z
  .preprocess((value) => {
    const normalized = emptyStringToNull(value);
    if (normalized === null || normalized === undefined) return null;
    if (typeof normalized === "number") return normalized;
    if (typeof normalized === "string") {
      const parsed = Number.parseInt(normalized, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return normalized;
  }, z.number().int().min(0).max(5).nullable())
  .optional()
  .default(null);

const contactSchema = z.object({
  id: nullableStringField,
  name: nullableStringField,
  email: nullableStringField,
  phone: nullableStringField,
});

const negotiatorSchema = z.object({
  id: nullableStringField,
  name: nullableStringField,
  email: nullableStringField,
  phone: nullableStringField,
});

const estateSchema = z.object({
  id: z.string().min(1),
  reference: nullableStringField,
  title: nullableStringField,
});

const feedbackSchema = z
  .object({
    rating: nullableRatingField,
    // Free-form string — SweepBright's enum is "no_interest" | "wants_info" |
    // "wants_to_visit" | "offer" | "deal", but we accept anything to stay
    // forward-compatible if SweepBright introduces new buckets, or surfaces
    // its UI label ("Wants to visit") rather than the snake_case key.
    outcome: nullableStringField,
    comment_public: nullableStringField,
    comment_internal: nullableStringField,
    offer_amount: nullableNumberField,
  })
  .nullable()
  .optional();

export const zapierVisitPayloadSchema = z.object({
  event: z.enum([
    "visit.scheduled",
    "visit.updated",
    "visit.cancelled",
    "visit.completed",
  ]),
  occurred_at: z.string().min(1),
  external_visit_id: z.string().min(1),
  estate: estateSchema,
  scheduled_at: nullableStringField,
  ended_at: nullableStringField,
  status: z.enum(["scheduled", "updated", "cancelled", "completed"]),
  negotiator: negotiatorSchema,
  contact: contactSchema,
  creator: negotiatorSchema,
  vendors: z.unknown().optional(),
  feedback: feedbackSchema,
});

export type ZapierVisitPayloadSchemaInput = z.input<
  typeof zapierVisitPayloadSchema
>;
export type ZapierVisitPayloadSchemaOutput = z.output<
  typeof zapierVisitPayloadSchema
>;
