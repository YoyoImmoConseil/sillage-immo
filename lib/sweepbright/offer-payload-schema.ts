import { z } from "zod";
import {
  nullableNumberField,
  nullableStringField,
  preprocessObjectField,
} from "./zapier-payload-schema";

/**
 * Schema for the SweepBright → Zapier → Sillage offer webhook.
 *
 * Wired to the `Offer Changed` trigger, which alone covers creation,
 * acceptance, refusal, cancellation, archiving and restoration, discriminated
 * by `reason`. One Zap instead of eight for the same information.
 *
 * Two Zapier quirks this schema absorbs, both already observed in production on
 * the visit webhook and documented in `zapier-payload-schema.ts`:
 *
 *  1. Every mapped value is quoted, so amounts arrive as strings ("972027",
 *     "960029.73") and blank fields as "" rather than null. Leaving them
 *     unquoted was not an option: a blank SweepBright field would emit
 *     `"transaction_amount": ,` and break the JSON on every incomplete offer.
 *
 *  2. Sub-objects declared in the Zapier "Data" UI may be serialised as Python
 *     `repr()` strings instead of nested JSON. The test preview shows clean
 *     JSON, but the visit webhook proved the preview is not what gets sent, so
 *     `offer` and `financials` are normalised before type-checking.
 */

const offerBodySchema = z.object({
  id: nullableStringField,
  parent_id: nullableStringField,
  property_id: nullableStringField,
  company_id: nullableStringField,
  status: nullableStringField,
  notes: nullableStringField,
  created_at: nullableStringField,
  updated_at: nullableStringField,
  valid_until: nullableStringField,
  accepted_at: nullableStringField,
  refused_at: nullableStringField,
  cancelled_at: nullableStringField,
  archived_at: nullableStringField,
});

const financialsSchema = z.object({
  currency: nullableStringField,
  direction: nullableStringField,
  transaction_amount: nullableNumberField,
  buyer_gross_amount: nullableNumberField,
  owner_net_amount: nullableNumberField,
  total_agency_fee: nullableNumberField,
  buyer_total_fee: nullableNumberField,
  buyer_fee_fixed: nullableNumberField,
  buyer_fee_percentage: nullableNumberField,
  owner_total_fee: nullableNumberField,
  owner_fee_fixed: nullableNumberField,
  owner_fee_percentage: nullableNumberField,
});

const emptyFinancials = {
  currency: null,
  direction: null,
  transaction_amount: null,
  buyer_gross_amount: null,
  owner_net_amount: null,
  total_agency_fee: null,
  buyer_total_fee: null,
  buyer_fee_fixed: null,
  buyer_fee_percentage: null,
  owner_total_fee: null,
  owner_fee_fixed: null,
  owner_fee_percentage: null,
} as const;

export const zapierOfferPayloadSchema = z.object({
  event: z.literal("offer.changed"),
  reason: nullableStringField,
  offer: z.preprocess(preprocessObjectField, offerBodySchema),
  // Zapier omits a sub-object entirely when all its fields are blank.
  financials: z
    .preprocess(preprocessObjectField, financialsSchema)
    .optional()
    .default({ ...emptyFinancials }),
});

export type ZapierOfferPayload = z.infer<typeof zapierOfferPayloadSchema>;

/**
 * Which milestone this event represents, and at what date.
 *
 * Deliberately computed server-side rather than in the Zap: a gateway that
 * interprets business meaning scatters the logic into an interface that can be
 * neither tested nor versioned.
 *
 * Outcome dates win over `updated_at`, because an accepted offer that is later
 * edited must stay dated at its acceptance. `created_at` is always present, so
 * it is only used as the milestone when nothing else distinguishes the event.
 */
export type OfferOccurrenceKind =
  | "accepted"
  | "refused"
  | "cancelled"
  | "archived"
  | "created"
  | "updated";

export type OfferOccurrence = {
  at: string;
  kind: OfferOccurrenceKind;
};

const firstIsoLike = (value: string | null): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number.isNaN(new Date(trimmed).getTime()) ? null : trimmed;
};

export const resolveOfferOccurrence = (
  offer: ZapierOfferPayload["offer"],
  fallbackIso: string
): OfferOccurrence => {
  const accepted = firstIsoLike(offer.accepted_at);
  if (accepted) return { at: accepted, kind: "accepted" };

  const refused = firstIsoLike(offer.refused_at);
  if (refused) return { at: refused, kind: "refused" };

  const cancelled = firstIsoLike(offer.cancelled_at);
  if (cancelled) return { at: cancelled, kind: "cancelled" };

  const archived = firstIsoLike(offer.archived_at);
  if (archived) return { at: archived, kind: "archived" };

  const created = firstIsoLike(offer.created_at);
  const updated = firstIsoLike(offer.updated_at);

  if (updated && created && updated !== created) {
    return { at: updated, kind: "updated" };
  }
  if (created) return { at: created, kind: "created" };
  if (updated) return { at: updated, kind: "updated" };

  return { at: fallbackIso, kind: "updated" };
};

/**
 * Milestones worth a row in the price journal.
 *
 * `cancelled`, `archived` and `updated` are excluded: they carry no new price,
 * and the cron replaying a delivery would otherwise append noise. An accepted
 * offer is filed as `agreement` because its amount is the agreed price — the
 * second term of the mandate-to-sale ratio, SweepBright exposing neither a
 * preliminary-sale nor a deed price.
 */
export const priceContextForOccurrence = (
  kind: OfferOccurrenceKind
): "offer" | "agreement" | null => {
  if (kind === "accepted") return "agreement";
  if (kind === "created" || kind === "refused") return "offer";
  return null;
};
