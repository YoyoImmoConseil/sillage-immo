import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";

export type CriteriaRow = { label: string; value: string };

export type DashboardCopy = {
  sectionSummary: string;
  sectionZone: string;
  sectionZoneHint: string;
  zoneNotSet: string;
  sectionMatches: string;
  sectionActions: string;
  pause: string;
  resume: string;
  archive: string;
  edit: string;
  save: string;
  cancel: string;
  noMatches: string;
  newBadge: string;
  scoreLabel: string;
  openListing: string;
  confirmArchive: string;
  labels: {
    businessType: string;
    sale: string;
    rental: string;
    cities: string;
    propertyTypes: string;
    budget: string;
    rooms: string;
    surface: string;
    floor: string;
    terrace: string;
    elevator: string;
    yes: string;
    no: string;
    any: string;
  };
};

export type EditState = {
  businessType: "sale" | "rental";
  locationText: string;
  propertyTypes: string;
  budgetMin: string;
  budgetMax: string;
  roomsMin: string;
  roomsMax: string;
  livingAreaMin: string;
  livingAreaMax: string;
  floorMin: string;
  floorMax: string;
  requiresTerrace: "any" | "yes" | "no";
  requiresElevator: "any" | "yes" | "no";
};

export const extractZonePolygon = (
  criteria: Record<string, unknown>
): ZonePolygon | null => {
  const raw = criteria?.zonePolygon;
  if (!Array.isArray(raw)) return null;
  const polygon: ZonePolygon = [];
  for (const point of raw) {
    if (
      Array.isArray(point) &&
      point.length === 2 &&
      typeof point[0] === "number" &&
      typeof point[1] === "number"
    ) {
      polygon.push([point[0], point[1]]);
    } else {
      return null;
    }
  }
  return polygon.length >= 3 ? polygon : null;
};

export const toInput = (value: number | null) => (value === null ? "" : String(value));

export const parseNullable = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};
