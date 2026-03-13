import type {
  SellerApartmentCondition,
  SellerBuildingAge,
  SellerPropertyType,
  SellerSeaView,
  SellerTimeline,
} from "@/types/domain/sellers";

export type Step = "form" | "verify" | "result";

export type FlowForm = {
  fullName: string;
  email: string;
  phone: string;
  propertyType: SellerPropertyType;
  propertyAddress: string;
  city: string;
  postalCode: string;
  timeline: SellerTimeline;
  occupancyStatus: string;
  livingArea: string;
  rooms: string;
  floor: string;
  buildingTotalFloors: string;
  elevator: "yes" | "no" | "";
  apartmentCondition: SellerApartmentCondition | "";
  buildingAge: SellerBuildingAge | "";
  seaView: SellerSeaView | "";
  diagnosticsReady: "yes" | "no";
  diagnosticsSupportNeeded: "yes" | "no";
  syndicDocsReady: "yes" | "no";
  syndicSupportNeeded: "yes" | "no";
  message: string;
};

export type ValuationResult = {
  valuationPriceLow: number | null;
  valuationPriceHigh: number | null;
  valuationPrice: number | null;
  addressLabel: string | null;
  cityName: string | null;
  cityZipCode: string | null;
  rooms: number | null;
  livingSpaceArea: number | null;
};

export type UpdateFlowForm = <K extends keyof FlowForm>(key: K, value: FlowForm[K]) => void;

export const initialForm: FlowForm = {
  fullName: "",
  email: "",
  phone: "",
  propertyType: "appartement",
  propertyAddress: "",
  city: "",
  postalCode: "",
  timeline: "immediate",
  occupancyStatus: "owner_occupied",
  livingArea: "",
  rooms: "",
  floor: "",
  buildingTotalFloors: "",
  elevator: "",
  apartmentCondition: "",
  buildingAge: "",
  seaView: "",
  diagnosticsReady: "no",
  diagnosticsSupportNeeded: "yes",
  syndicDocsReady: "no",
  syndicSupportNeeded: "yes",
  message: "",
};

export const toOptionalNumber = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return undefined;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toOptionalInteger = (value: string) => {
  const normalized = value.replace(/[^\d]/g, "");
  if (!normalized) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const formatEur = (value: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
};
