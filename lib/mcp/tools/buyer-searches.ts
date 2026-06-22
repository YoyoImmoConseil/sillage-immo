import type { ToolDefinition } from "../types";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Database } from "@/types/db/supabase";

type BuyerSearchProfileUpsert =
  Database["public"]["Tables"]["buyer_search_profiles"]["Insert"];

const arrayOfStrings = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
};

export const buyerSearchesTools: ToolDefinition<unknown, unknown>[] = [
  {
    name: "buyer_searches.upsert",
    mutates: true,
    description:
      "Cree ou met a jour le buyer_search_profile actif d'un buyer_lead. Idempotent par buyer_lead_id.",
    version: "1.0.0",
    inputSchema: {
      type: "object",
      properties: {
        buyerLeadId: { type: "string", format: "uuid" },
        businessType: { type: "string", enum: ["sale", "rental"] },
        locationText: { type: "string" },
        cities: { type: "array", items: { type: "string" } },
        propertyTypes: { type: "array", items: { type: "string" } },
        budgetMin: { type: "number", minimum: 0 },
        budgetMax: { type: "number", minimum: 0 },
        roomsMin: { type: "number", minimum: 0 },
        roomsMax: { type: "number", minimum: 0 },
        bedroomsMin: { type: "number", minimum: 0 },
        livingAreaMin: { type: "number", minimum: 0 },
        livingAreaMax: { type: "number", minimum: 0 },
        floorMin: { type: "number" },
        floorMax: { type: "number" },
        requiresTerrace: { type: "boolean" },
        requiresElevator: { type: "boolean" },
      },
      required: ["buyerLeadId", "businessType"],
      additionalProperties: false,
    },
    handler: async (input) => {
      const payload = input as {
        buyerLeadId: string;
        businessType: "sale" | "rental";
        locationText?: string;
        cities?: unknown;
        propertyTypes?: unknown;
        budgetMin?: number;
        budgetMax?: number;
        roomsMin?: number;
        roomsMax?: number;
        bedroomsMin?: number;
        livingAreaMin?: number;
        livingAreaMax?: number;
        floorMin?: number;
        floorMax?: number;
        requiresTerrace?: boolean;
        requiresElevator?: boolean;
      };

      const now = new Date().toISOString();

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("buyer_search_profiles")
        .select("id")
        .eq("buyer_lead_id", payload.buyerLeadId)
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);

      const upsertPayload: BuyerSearchProfileUpsert = {
        buyer_lead_id: payload.buyerLeadId,
        business_type: payload.businessType,
        status: "active",
        location_text: payload.locationText?.trim() || null,
        cities: arrayOfStrings(payload.cities),
        property_types: arrayOfStrings(payload.propertyTypes),
        budget_min: payload.budgetMin ?? null,
        budget_max: payload.budgetMax ?? null,
        rooms_min: payload.roomsMin ?? null,
        rooms_max: payload.roomsMax ?? null,
        bedrooms_min: payload.bedroomsMin ?? null,
        living_area_min: payload.livingAreaMin ?? null,
        living_area_max: payload.livingAreaMax ?? null,
        floor_min: payload.floorMin ?? null,
        floor_max: payload.floorMax ?? null,
        requires_terrace: payload.requiresTerrace ?? null,
        requires_elevator: payload.requiresElevator ?? null,
        criteria: {},
        updated_at: now,
      };

      if (existing?.id) {
        const { data, error } = await supabaseAdmin
          .from("buyer_search_profiles")
          .update(upsertPayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        return { searchProfile: data, mode: "updated" as const };
      }

      const { data, error } = await supabaseAdmin
        .from("buyer_search_profiles")
        .insert(upsertPayload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { searchProfile: data, mode: "created" as const };
    },
  },
];
