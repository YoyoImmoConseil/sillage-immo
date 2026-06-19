import { z } from "zod";
import type { BuyerSignupCriteriaInput } from "@/services/buyers/buyer-signup.service";

/**
 * Schéma de validation partagé pour la "définition de recherche acquéreur".
 *
 * Mutualisé entre le flux public (`POST /api/buyer-searches`) et la création
 * manuelle en back-office (`POST /api/admin/buyer-leads`) afin que les deux
 * points d'entrée appliquent exactement les mêmes règles et la même finesse
 * de critères (zone dessinée comprise).
 */

export const zonePolygonSchema = z
  .array(
    z.tuple([
      z.number().min(-90).max(90),
      z.number().min(-180).max(180),
    ])
  )
  .min(3)
  .max(200)
  .nullable()
  .optional();

export const buyerSearchCriteriaSchema = z.object({
  businessType: z.enum(["sale", "rental"]),
  cities: z.array(z.string().min(1)).max(20).default([]),
  propertyTypes: z.array(z.string().min(1)).max(20).default([]),
  locationText: z.string().max(500).optional().nullable(),
  budgetMin: z.number().int().nonnegative().nullable().optional(),
  budgetMax: z.number().int().nonnegative().nullable().optional(),
  roomsMin: z.number().int().min(0).max(50).nullable().optional(),
  roomsMax: z.number().int().min(0).max(50).nullable().optional(),
  bedroomsMin: z.number().int().min(0).max(50).nullable().optional(),
  livingAreaMin: z.number().int().min(0).max(10000).nullable().optional(),
  livingAreaMax: z.number().int().min(0).max(10000).nullable().optional(),
  floorMin: z.number().int().min(-5).max(200).nullable().optional(),
  floorMax: z.number().int().min(-5).max(200).nullable().optional(),
  requiresTerrace: z.boolean().nullable().optional(),
  requiresElevator: z.boolean().nullable().optional(),
  zonePolygon: zonePolygonSchema,
});

export type BuyerSearchCriteriaPayload = z.infer<typeof buyerSearchCriteriaSchema>;

/**
 * Normalise le bloc critères validé en entrée du service `createBuyerSearchSignup`
 * (tous les champs optionnels deviennent explicitement `null`).
 */
export const toBuyerSignupCriteria = (
  criteria: BuyerSearchCriteriaPayload
): BuyerSignupCriteriaInput => ({
  businessType: criteria.businessType,
  cities: criteria.cities,
  propertyTypes: criteria.propertyTypes,
  locationText: criteria.locationText ?? null,
  budgetMin: criteria.budgetMin ?? null,
  budgetMax: criteria.budgetMax ?? null,
  roomsMin: criteria.roomsMin ?? null,
  roomsMax: criteria.roomsMax ?? null,
  bedroomsMin: criteria.bedroomsMin ?? null,
  livingAreaMin: criteria.livingAreaMin ?? null,
  livingAreaMax: criteria.livingAreaMax ?? null,
  floorMin: criteria.floorMin ?? null,
  floorMax: criteria.floorMax ?? null,
  requiresTerrace: criteria.requiresTerrace ?? null,
  requiresElevator: criteria.requiresElevator ?? null,
  zonePolygon: criteria.zonePolygon ?? null,
});
