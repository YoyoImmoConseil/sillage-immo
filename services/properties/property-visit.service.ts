import "server-only";

import { computeContactInitials } from "@/lib/sweepbright/contact-initials";
import { parseSweepBrightZapierDate } from "@/lib/sweepbright/zapier-date";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  splitVisitsByTime as splitVisitsByTimeImpl,
  toAdminView,
  toClientView,
  type PropertyVisitAdminView,
  type PropertyVisitClientView,
  type PropertyVisitRow,
} from "@/services/properties/property-visit.projection";
import type {
  SweepBrightZapierVisitEventName,
  SweepBrightZapierVisitPayload,
} from "@/types/api/sweepbright";
import type { Database } from "@/types/db/supabase";

export type {
  PropertyVisitClientView,
  PropertyVisitAdminView,
} from "@/services/properties/property-visit.projection";

export const splitVisitsByTime = splitVisitsByTimeImpl;

const ZAPIER_EVENT_TO_STATUS: Record<
  SweepBrightZapierVisitEventName,
  PropertyVisitRow["status"]
> = {
  "visit.scheduled": "scheduled",
  "visit.updated": "updated",
  "visit.cancelled": "cancelled",
  "visit.completed": "completed",
};

export type ResolvedSweepBrightProperty = {
  id: string;
  sourceRef: string;
};

export const findPropertyBySweepBrightId = async (
  estateId: string
): Promise<ResolvedSweepBrightProperty | null> => {
  const { data, error } = await supabaseAdmin
    .from("properties")
    .select("id, source_ref")
    .eq("source", "sweepbright")
    .eq("source_ref", estateId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return { id: data.id, sourceRef: data.source_ref };
};

export type UpsertVisitFromZapierResult = {
  visit: PropertyVisitRow;
  created: boolean;
};

const toIsoOrNull = (value: string | null): string | null => {
  if (value == null) return null;
  const parsed = parseSweepBrightZapierDate(value);
  return parsed ? parsed.toISOString() : null;
};

export const upsertVisitFromZapierPayload = async (input: {
  payload: SweepBrightZapierVisitPayload;
  propertyId: string;
}): Promise<UpsertVisitFromZapierResult> => {
  const { payload, propertyId } = input;
  const status = ZAPIER_EVENT_TO_STATUS[payload.event];

  const scheduledAtIso = toIsoOrNull(payload.scheduled_at);
  const endedAtIso = toIsoOrNull(payload.ended_at);

  const { data: existingRaw, error: existingError } = await supabaseAdmin
    .from("property_visits")
    .select("*")
    .eq("external_visit_id", payload.external_visit_id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }
  const existing = (existingRaw ?? null) as PropertyVisitRow | null;

  const baseRow: Database["public"]["Tables"]["property_visits"]["Insert"] = {
    property_id: propertyId,
    external_visit_id: payload.external_visit_id,
    status,
    scheduled_at: scheduledAtIso,
    ended_at: endedAtIso,
    negotiator_email: payload.negotiator.email,
    negotiator_name: payload.negotiator.name,
    negotiator_phone: payload.negotiator.phone,
    contact_external_id: payload.contact.id,
    contact_email: payload.contact.email,
    contact_name: payload.contact.name,
    contact_phone: payload.contact.phone,
    creator_email: payload.creator.email,
    creator_name: payload.creator.name,
    creator_phone: payload.creator.phone,
    feedback_rating: payload.feedback?.rating ?? null,
    feedback_comment_public: payload.feedback?.comment_public ?? null,
    feedback_comment_internal: payload.feedback?.comment_internal ?? null,
    feedback_offer_amount: payload.feedback?.offer_amount ?? null,
    zapier_event: payload.event,
    occurred_at: payload.occurred_at,
    raw_payload: payload as unknown as Record<string, unknown>,
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("property_visits")
      .update(baseRow)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Unable to update property visit.");
    }
    return { visit: data as PropertyVisitRow, created: false };
  }

  const { data, error } = await supabaseAdmin
    .from("property_visits")
    .insert(baseRow)
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "Unable to insert property visit.");
  }
  return { visit: data as PropertyVisitRow, created: true };
};

/* ===================================================================
 * Read projections (admin vs client)
 * =================================================================== */

/**
 * Fetch visits attached to a property, projected for the requested audience.
 *
 * Both audiences read via `supabaseAdmin` (service_role); access control
 * is the caller's responsibility (e.g. `getSellerPortalPropertyDetail`
 * already verifies the auth user owns the property before calling this).
 *
 * The "client" projection strips PII and replaces visitor identity with
 * initials, mirroring the SQL view `property_visits_public_v`.
 */
export async function listVisitsForProperty(
  propertyId: string,
  audience: "client"
): Promise<PropertyVisitClientView[]>;
export async function listVisitsForProperty(
  propertyId: string,
  audience: "admin"
): Promise<PropertyVisitAdminView[]>;
export async function listVisitsForProperty(
  propertyId: string,
  audience: "client" | "admin"
): Promise<PropertyVisitClientView[] | PropertyVisitAdminView[]> {
  const { data, error } = await supabaseAdmin
    .from("property_visits")
    .select("*")
    .eq("property_id", propertyId)
    .order("scheduled_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as PropertyVisitRow[];
  if (audience === "admin") {
    return rows.map(toAdminView);
  }
  return rows.map(toClientView);
}

/* ===================================================================
 * client_project_events emission
 * =================================================================== */

const ZAPIER_EVENT_TO_DOMAIN_NAME: Record<
  SweepBrightZapierVisitEventName,
  string
> = {
  "visit.scheduled": "viewing.scheduled",
  "visit.updated": "viewing.updated",
  "visit.cancelled": "viewing.cancelled",
  "visit.completed": "viewing.completed",
};

/**
 * Mirror a visit event into client_project_events for every seller project
 * attached to the property, so the seller portal timeline reflects it.
 *
 * Idempotency: duplicates the event for each (project, visit, status)
 * pairing is acceptable because client_project_events is an append-only
 * activity log. The webhook handler dedupes upstream via property_visits's
 * unique external_visit_id, so re-deliveries do not chain through.
 */
export const recordVisitEventsForProjects = async (input: {
  propertyId: string;
  payload: SweepBrightZapierVisitPayload;
  visit: PropertyVisitRow;
}): Promise<{ insertedCount: number }> => {
  const { propertyId, payload, visit } = input;

  const { data: links, error: linksError } = await supabaseAdmin
    .from("project_properties")
    .select("client_project_id")
    .eq("property_id", propertyId)
    .is("unlinked_at", null);

  if (linksError) {
    throw new Error(linksError.message);
  }

  const projectIds = Array.from(
    new Set(
      (links ?? []).map(
        (row) => (row as { client_project_id: string }).client_project_id
      )
    )
  );

  if (projectIds.length === 0) {
    return { insertedCount: 0 };
  }

  const { data: sellerLinks, error: sellerError } = await supabaseAdmin
    .from("seller_projects")
    .select("id, client_project_id")
    .in("client_project_id", projectIds);

  if (sellerError) {
    throw new Error(sellerError.message);
  }

  const sellerProjectByProjectId = new Map<string, string>();
  for (const row of (sellerLinks ?? []) as Array<{
    id: string;
    client_project_id: string;
  }>) {
    sellerProjectByProjectId.set(row.client_project_id, row.id);
  }

  const eventName = ZAPIER_EVENT_TO_DOMAIN_NAME[payload.event];
  const eventPayload: Record<string, unknown> = {
    propertyId,
    visitId: visit.id,
    externalVisitId: visit.external_visit_id,
    status: visit.status,
    scheduledAt: visit.scheduled_at,
    endedAt: visit.ended_at,
    negotiatorName: visit.negotiator_name,
    contactInitials: computeContactInitials(visit.contact_name),
    occurredAt: payload.occurred_at,
  };

  const rows = projectIds.map((clientProjectId) => ({
    client_project_id: clientProjectId,
    seller_project_id: sellerProjectByProjectId.get(clientProjectId) ?? null,
    event_name: eventName,
    event_category: "viewing",
    visible_to_client: true,
    actor_type: "system",
    payload: eventPayload,
  }));

  const { error: insertError, count } = await supabaseAdmin
    .from("client_project_events")
    .insert(rows, { count: "exact" });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { insertedCount: count ?? rows.length };
};
