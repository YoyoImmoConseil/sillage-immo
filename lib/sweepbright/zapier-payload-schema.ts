import { z } from "zod";

/**
 * Zod schema for the SweepBright → Zapier → Sillage webhook body.
 *
 * Real-world quirks of Zapier's "Webhooks by Zapier (POST)" action that this
 * schema must absorb defensively (all captured live in production on
 * 7–11 May 2026 against the `visit.scheduled` and `lead_reaction_changed`
 * triggers):
 *
 *  1. Zapier serialises **empty trigger fields as `""` (empty string)** rather
 *     than `null`, even when the Zap body literally maps the value to `null`.
 *
 *  2. Numeric fields surfaced by SweepBright sometimes arrive as **stringified
 *     numbers** (e.g. an `offer_amount` may travel as `"150000"`).
 *
 *  3. **Sub-objects defined in the Zapier "Data" UI are serialised as Python
 *     `repr()` strings** (single-quoted keys/values, fallback to double quotes
 *     when the value contains apostrophes) rather than as recursive JSON.
 *     Captured payload sample (visit.completed, 11 May 2026):
 *       "estate": "{'id': '7aeb3936-...'}"
 *       "contact": "{'id': '...', 'name': 'Louise DUMAS', ...}"
 *       "feedback": "{'outcome': 'Wants to visit',
 *                     'comment_public': \"l'appartement ...\"}"
 *
 *  4. **Sub-objects whose every field is blank are omitted entirely** from
 *     the body. We observed this for `negotiator` and `creator` in the same
 *     visit.completed payload.
 *
 * The validation layer therefore normalises *before* type-checking, so callers
 * downstream see a clean nested-object shape regardless of what Zapier actually
 * serialised. Longer term the Zap body should be reconfigured to use flat keys
 * (`estate__id`, `contact__email`, …) + `unflatten: true` so Zapier emits real
 * nested JSON, at which point most of these helpers become no-ops (but still
 * safe).
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

/**
 * Convert a Python `repr()`-style stringified object into a JSON-compatible
 * string, then JSON.parse it. Walks the input character-by-character so we
 * never confuse quote delimiters with apostrophes inside double-quoted values
 * (Python uses single quotes by default and falls back to double quotes when
 * the content contains apostrophes).
 *
 * Examples:
 *   "{'id': 'abc'}"                       → { id: "abc" }
 *   "{'a': {'b': 'c'}}"                   → { a: { b: "c" } }
 *   "{'a': \"b's value\"}"                → { a: "b's value" }
 *   "{'a': None, 'b': True}"              → { a: null, b: true }
 *
 * Returns `null` when the input does not look like a stringified object/array
 * or when parsing fails — callers handle that gracefully via fallback paths.
 */
const tryParsePythonRepr = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (
    !(
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    )
  ) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // not strict JSON — fall through to Python-repr normalisation
  }

  let output = "";
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const prev = i > 0 ? trimmed[i - 1] : "";

    if (inDoubleQuote) {
      output += ch;
      if (ch === '"' && prev !== "\\") inDoubleQuote = false;
      continue;
    }

    if (inSingleQuote) {
      if (ch === "'" && prev !== "\\") {
        inSingleQuote = false;
        output += '"';
      } else if (ch === '"') {
        output += '\\"';
      } else {
        output += ch;
      }
      continue;
    }

    if (ch === '"') {
      inDoubleQuote = true;
      output += ch;
    } else if (ch === "'") {
      inSingleQuote = true;
      output += '"';
    } else {
      output += ch;
    }
  }

  const normalised = output
    .replace(/(:\s*)None\b/g, "$1null")
    .replace(/(:\s*)True\b/g, "$1true")
    .replace(/(:\s*)False\b/g, "$1false");

  try {
    return JSON.parse(normalised);
  } catch {
    return null;
  }
};

/**
 * Preprocessor for nested-object fields. Accepts:
 *   - real objects (no-op pass-through)
 *   - Python `repr()` stringified objects (parsed via tryParsePythonRepr)
 *   - null / undefined (returned as-is so optional/default kick in)
 *
 * Anything else (number, boolean, weird string) is passed through unchanged
 * so the downstream Zod schema can emit a precise validation error.
 */
const preprocessObjectField = (value: unknown): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    const parsed = tryParsePythonRepr(value);
    return parsed ?? value;
  }
  return value;
};

const emptyNegotiator = {
  id: null,
  name: null,
  email: null,
  phone: null,
} as const;

const preprocessNegotiatorLike = (value: unknown): unknown => {
  if (value === null || value === undefined) return { ...emptyNegotiator };
  return preprocessObjectField(value);
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
  estate: z.preprocess(preprocessObjectField, estateSchema),
  scheduled_at: nullableStringField,
  ended_at: nullableStringField,
  status: z.enum(["scheduled", "updated", "cancelled", "completed"]),
  negotiator: z.preprocess(preprocessNegotiatorLike, negotiatorSchema),
  contact: z.preprocess(preprocessObjectField, contactSchema),
  creator: z.preprocess(preprocessNegotiatorLike, negotiatorSchema),
  vendors: z.unknown().optional(),
  feedback: z.preprocess(preprocessObjectField, feedbackSchema),
});

export type ZapierVisitPayloadSchemaInput = z.input<
  typeof zapierVisitPayloadSchema
>;
export type ZapierVisitPayloadSchemaOutput = z.output<
  typeof zapierVisitPayloadSchema
>;
