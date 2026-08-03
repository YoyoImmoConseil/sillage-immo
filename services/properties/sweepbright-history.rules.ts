/**
 * Pure decision rules for the SweepBright price and status journals.
 *
 * Kept free of `server-only` and of any Supabase import so they can be unit
 * tested directly, like `property-visit.projection.ts`. The subtlety these
 * rules carry is what protects the public register from publishing a
 * fabricated ratio, so it must be pinned by tests rather than reviewed by eye.
 */
import { isPublicAvailabilityStatus } from "@/lib/properties/canonical-types";

export type PriceEventDecision = "mandate" | "baseline" | "listing_change" | null;

/**
 * Is this sync the moment that fixes the mandate price?
 *
 * The Sillage definition is "the price at the first transition to a public
 * status". Detecting it needs care: on the first sync after this lot ships,
 * every already-published property would look like a first transition and we
 * would freeze today's price as if it were the mandate price — fabricating
 * exactly the flattering ratio the register must never publish.
 *
 * So it only counts when the previous state is known to be non-public, or when
 * the property is new to us (SweepBright `estate-added` fires at creation).
 * `agreement` and `option` being public statuses, the
 * available → agreement → sold sequence freezes the price once only.
 */
export const isFirstPublicTransition = (input: {
  isPublic: boolean;
  previousStatus: string | null;
  hasFirstPublicEvent: boolean;
}): boolean => {
  if (!input.isPublic) return false;
  if (input.hasFirstPublicEvent) return false;
  return !isPublicAvailabilityStatus(input.previousStatus);
};

/**
 * Which price context this sync produces, if any.
 *
 * `baseline` is the honest label for a property already in flight when the
 * journal started: the first price we ever observed, not the asking price at
 * mandate. A register computing a ratio from a baseline would flatter it, so
 * the two must never be conflated.
 *
 * `null` means "nothing to record": without it, the cron running every ten
 * minutes would append an identical row at each pass.
 */
export const decidePriceContext = (input: {
  firstPublicTransition: boolean;
  lastPriceAmount: number | null;
  amount: number;
}): PriceEventDecision => {
  if (input.firstPublicTransition) return "mandate";
  if (input.lastPriceAmount === null) return "baseline";
  return input.lastPriceAmount === input.amount ? null : "listing_change";
};
