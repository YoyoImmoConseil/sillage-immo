import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emitDomainEvent } from "@/lib/events/domain-events";

export const propertyListingsTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "property_listings.publish",
    mutates: true,
    description:
      "Publie un listing (is_published=true, publication_status=active) et emet un evenement de domaine.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        listingId: { type: "string", format: "uuid" },
      },
      required: ["listingId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const { listingId } = input as { listingId: string };
      const now = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("property_listings")
        .update({
          is_published: true,
          publication_status: "active",
          published_at: now,
          unpublished_at: null,
          updated_at: now,
        })
        .eq("id", listingId)
        .select("id, property_id, is_published, publication_status, published_at")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Listing introuvable.");

      try {
        await emitDomainEvent({
          aggregateType: "property_listing",
          aggregateId: data.id,
          eventName: "property_listing.published",
          payload: { propertyId: data.property_id },
        });
      } catch {
        // non-blocking outbox
      }

      return {
        listingId: data.id,
        propertyId: data.property_id,
        isPublished: data.is_published,
        publicationStatus: data.publication_status,
        publishedAt: data.published_at,
      };
    },
  },
  {
    name: "property_listings.unpublish",
    mutates: true,
    description:
      "Depublie un listing (is_published=false, publication_status=draft) et emet un evenement de domaine.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        listingId: { type: "string", format: "uuid" },
        reason: { type: "string" },
      },
      required: ["listingId"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as { listingId: string; reason?: string };
      const now = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("property_listings")
        .update({
          is_published: false,
          publication_status: "inactive",
          unpublished_at: now,
          updated_at: now,
        })
        .eq("id", payload.listingId)
        .select("id, property_id, is_published, publication_status, unpublished_at")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Listing introuvable.");

      try {
        await emitDomainEvent({
          aggregateType: "property_listing",
          aggregateId: data.id,
          eventName: "property_listing.unpublished",
          payload: {
            propertyId: data.property_id,
            reason: payload.reason ?? null,
          },
        });
      } catch {
        // non-blocking outbox
      }

      return {
        listingId: data.id,
        propertyId: data.property_id,
        isPublished: data.is_published,
        publicationStatus: data.publication_status,
        unpublishedAt: data.unpublished_at,
      };
    },
  },
];
