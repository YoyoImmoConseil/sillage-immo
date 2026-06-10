import type { PropertyBusinessType } from "@/types/domain/properties";
import type { ZonePolygon } from "@/app/components/buyer-search-zone-map";

export type FormState = {
  businessType: PropertyBusinessType;
  city: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  minSurface: string;
  maxSurface: string;
  minFloor: string;
  maxFloor: string;
  terrace: "" | "true" | "false";
  elevator: "" | "true" | "false";
  zonePolygon: ZonePolygon | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  rgpd: boolean;
};

export type UiStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; email: string }
  | { kind: "success_email_failed"; email: string }
  | { kind: "error"; message: string };

export const parseNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseBool = (value: string): boolean | null => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

export const normalizeTerrace = (value: string): "" | "true" | "false" =>
  value === "true" || value === "false" ? value : "";
