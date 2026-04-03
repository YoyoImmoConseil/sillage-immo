import type { PropertyBusinessType } from "./properties";

export type BuyerLeadStatus = "new" | "qualified" | "active_search" | "visit" | "won" | "lost";
export type BuyerSearchProfileStatus = "active" | "paused" | "closed";

export type BuyerLeadSnapshot = {
  id: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
  email: string;
  phone: string | null;
  source: string | null;
  status: BuyerLeadStatus;
  timeline: string | null;
  financingStatus: string | null;
  preferredContactChannel: string | null;
  notes: string | null;
  assignedAdminProfileId: string | null;
  metadata: Record<string, unknown>;
};

export type BuyerSearchProfileSnapshot = {
  id: string;
  buyerLeadId: string;
  businessType: PropertyBusinessType;
  status: string;
  locationText: string | null;
  cities: string[];
  propertyTypes: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  roomsMin: number | null;
  roomsMax: number | null;
  bedroomsMin: number | null;
  livingAreaMin: number | null;
  livingAreaMax: number | null;
  floorMin: number | null;
  floorMax: number | null;
  requiresTerrace: boolean | null;
  requiresElevator: boolean | null;
  criteria: Record<string, unknown>;
};

export type BuyerPropertyMatchSnapshot = {
  id: string;
  buyerLeadId: string;
  buyerSearchProfileId: string;
  propertyId: string;
  propertyListingId: string;
  score: number;
  status: string;
  blockers: string[];
  matchedCriteria: Record<string, unknown>;
  notes: string | null;
  computedAt: string;
};
