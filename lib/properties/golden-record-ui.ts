import type {
  GoldenSource,
  GoldenOverrideField,
  PropertyGoldenRecord,
} from "@/services/properties/golden-record.service";

// Constantes UI partagées pour l'affichage du golden record
// (fiche bien unifiée + arbitrage des divergences). Pas de "server-only" :
// ce module est consommé par des composants client.

export const GOLDEN_SOURCE_LABELS: Record<GoldenSource, string> = {
  manual: "Manuel",
  sweepbright: "SweepBright",
  mynotary: "MyNotary",
  estimator: "Estimateur",
};

export const GOLDEN_SOURCE_BADGE_CLASS: Record<GoldenSource, string> = {
  manual: "bg-violet-100 text-violet-900 border-violet-300",
  sweepbright: "bg-sky-100 text-sky-900 border-sky-300",
  mynotary: "bg-emerald-100 text-emerald-900 border-emerald-300",
  estimator: "bg-amber-100 text-amber-900 border-amber-300",
};

export type GoldenFieldKind = "text" | "price" | "area" | "number";

export type GoldenFieldDef = {
  field: GoldenOverrideField;
  label: string;
  kind: GoldenFieldKind;
  get: (g: PropertyGoldenRecord) => {
    value: unknown;
    source: GoldenSource | null;
    alternatives: Array<{ value: unknown; source: GoldenSource }>;
    hasDivergence: boolean;
  };
};

export const GOLDEN_RECORD_FIELDS: GoldenFieldDef[] = [
  { field: "address", label: "Adresse", kind: "text", get: (g) => g.address },
  { field: "price", label: "Prix", kind: "price", get: (g) => g.price },
  { field: "livingArea", label: "Surface habitable", kind: "area", get: (g) => g.livingArea },
  { field: "propertyType", label: "Type de bien", kind: "text", get: (g) => g.propertyType },
  { field: "rooms", label: "Pièces", kind: "number", get: (g) => g.rooms },
  { field: "floor", label: "Étage", kind: "number", get: (g) => g.floor },
  { field: "seller.fullName", label: "Vendeur — nom", kind: "text", get: (g) => g.seller.fullName },
  { field: "seller.email", label: "Vendeur — email", kind: "text", get: (g) => g.seller.email },
  { field: "seller.phone", label: "Vendeur — téléphone", kind: "text", get: (g) => g.seller.phone },
];

export const formatGoldenFieldValue = (value: unknown, kind: GoldenFieldKind): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "price" && typeof value === "number") {
    return `${value.toLocaleString("fr-FR")} €`;
  }
  if (kind === "area" && typeof value === "number") {
    return `${value} m²`;
  }
  return String(value);
};
