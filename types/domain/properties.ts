export type PropertyBusinessType = "sale" | "rental";
export type PropertyKind = PropertyBusinessType | "project" | "unit";
export type PropertyPublicationStatus = "active" | "inactive" | "deleted";
export type PropertyMediaKind = "image" | "plan" | "document";

export type PropertyMediaSnapshot = {
  id: string;
  propertyId: string;
  kind: PropertyMediaKind;
  ordinal: number;
  title: string | null;
  description: string | null;
  contentType: string | null;
  remoteUrl: string | null;
  cachedUrl: string | null;
  expiresAt: string | null;
};

export type PropertySnapshot = {
  id: string;
  source: string;
  sourceRef: string;
  companyId: string | null;
  projectId: string | null;
  isProject: boolean;
  kind: PropertyKind;
  negotiation: string | null;
  title: string | null;
  description: string | null;
  propertyType: string | null;
  subType: string | null;
  availabilityStatus: string | null;
  generalCondition: string | null;
  address: {
    street: string | null;
    streetNumber: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  surfaces: {
    livingArea: number | null;
    plotArea: number | null;
  };
  rooms: {
    bedrooms: number | null;
    bathrooms: number | null;
    rooms: number | null;
    floor: number | null;
  };
  amenities: {
    hasTerrace: boolean | null;
    hasElevator: boolean | null;
  };
  media: PropertyMediaSnapshot[];
  virtualTourUrl: string | null;
  videoUrl: string | null;
  appointmentServiceUrl: string | null;
  negotiator: Record<string, unknown>;
  legal: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string;
};

export type PropertyListingSnapshot = {
  id: string;
  propertyId: string;
  businessType: PropertyBusinessType;
  publicationStatus: PropertyPublicationStatus;
  isPublished: boolean;
  slug: string;
  canonicalPath: string;
  title: string | null;
  city: string | null;
  postalCode: string | null;
  propertyType: string | null;
  coverImageUrl: string | null;
  rooms: number | null;
  bedrooms: number | null;
  livingArea: number | null;
  floor: number | null;
  hasTerrace: boolean | null;
  hasElevator: boolean | null;
  priceAmount: number | null;
  priceCurrency: string;
  publishedAt: string | null;
  unpublishedAt: string | null;
  property: PropertySnapshot;
};
