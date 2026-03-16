const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Appartement",
  appartement: "Appartement",
  house: "Maison",
  maison: "Maison",
  villa: "Villa",
  studio: "Studio",
  loft: "Loft",
  duplex: "Duplex",
  triplex: "Triplex",
  penthouse: "Penthouse",
  land: "Terrain",
  terrain: "Terrain",
  office: "Bureau",
  bureau: "Bureau",
  garage: "Garage",
  parking: "Parking",
  building: "Immeuble",
  immeuble: "Immeuble",
  shop: "Local commercial",
  commercial: "Local commercial",
  retail: "Local commercial",
  other: "Autre",
  autre: "Autre",
};

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const formatPropertyTypeLabel = (value: string | null | undefined) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase().replace(/[_-]+/g, " ");
  return PROPERTY_TYPE_LABELS[normalized] ?? toTitleCase(normalized);
};
