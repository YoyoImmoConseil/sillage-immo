import type { Database } from "@/types/db/supabase";
import { fromCents, toCents } from "@/lib/properties/money";
import { inferListingTransactionKind } from "@/lib/properties/listing-price";
import {
  buildPropertyDerivedFields,
  buildPropertyEnergySnapshot,
} from "@/services/properties/property-presentation";
import {
  DPE_BLANK_SENTENCE,
  DPE_EXEMPT_SENTENCE,
  GEORISQUES_SENTENCE,
  dpeClassesSentence,
  dpeExcessiveSentence,
  resolveDpeStatus,
  type DpeClass,
} from "./dpe";
import {
  NON_CONDO_PROPERTY_TYPES,
  VITRINE_FOOTER,
  VITRINE_HEADLINE,
  VITRINE_PROPERTY_TYPE_LABELS,
} from "./poster-copy";
import {
  CLOSED_POSTER_MODELS,
  VITRINE_POSTER_HEADLINES,
  VITRINE_RIBBONS,
  resolveVitrinePosterModel,
  type VitrinePosterModel,
  type VitrineRibbonSpec,
} from "./poster-status";
import { isDetailPageServed } from "@/lib/properties/canonical-types";
import { VITRINE_HIGHLIGHTS_MIN } from "@/lib/properties/vitrine-editorial";

type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
type ListingRow = Pick<
  Database["public"]["Tables"]["property_listings"]["Row"],
  "price_amount" | "canonical_path" | "business_type" | "is_published" | "publication_status"
>;

export type VitrineEnergyBlock =
  | {
      kind: "scales";
      energyClass: DpeClass;
      energyValue: number | null;
      climateClass: DpeClass;
      climateValue: number | null;
    }
  | { kind: "text" };

/**
 * Contenu textuel de l'affiche, entièrement calculé : le rendu PDF n'a plus
 * qu'à placer ces chaînes. Toutes les règles métier vivent ici, testables
 * sans base ni PDF.
 */
export type VitrinePosterContent = {
  /** Modèle d'affiche selon le statut (null si le statut est bloquant). */
  model: VitrinePosterModel | null;
  modelLabel: string | null;
  /** Ruban d'angle à dessiner (null pour À vendre / À louer). */
  ribbon: VitrineRibbonSpec | null;
  headline: string;
  typeLine: string;
  locationLine: string;
  priceLine: string;
  legalLines: string[];
  highlights: string[];
  characteristicsLine: string;
  reference: string | null;
  energy: VitrineEnergyBlock;
  dpeParagraph: string;
  qrUrl: string;
  footer: string;
};

export type VitrinePosterContentResult = {
  content: VitrinePosterContent;
  /** Manques bloquants : l'affiche ne doit pas être produite. */
  errors: string[];
  /** Points à vérifier, l'affiche est produite quand même. */
  warnings: string[];
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const asNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readPath = (root: unknown, path: string[]): unknown => {
  let current: unknown = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record) return undefined;
    current = record[key];
  }
  return current;
};

const NBSP = " ";

export const formatEuros = (amount: number, options?: { decimals?: number }) => {
  const decimals = options?.decimals ?? 0;
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  // Intl sépare les milliers par une espace fine insécable (U+202F) que les
  // polices embarquées n'ont pas : on la remplace par l'espace insécable.
  return `${formatted.replace(/[\u202f\u00a0 ]/g, NBSP)}${NBSP}€`;
};

// « 32,18 m² », « 4,70 m² », « 89 m² » : deux décimales dès qu'il y en a.
export const formatArea = (value: number) => {
  const decimals = Number.isInteger(value) ? 0 : 2;
  const formatted = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    .format(value)
    .replace(/[\u202f\u00a0 ]/g, NBSP);
  return `${formatted}${NBSP}m²`;
};

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)}${NBSP}%`;

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count}${NBSP}${count > 1 ? pluralForm : singular}`;

const propertyTypeLabel = (propertyType: string | null) => {
  const key = (propertyType ?? "").trim().toLowerCase();
  return VITRINE_PROPERTY_TYPE_LABELS[key] ?? (key ? key[0].toUpperCase() + key.slice(1) : "Bien");
};

const isNonCondoType = (propertyType: string | null) =>
  NON_CONDO_PROPERTY_TYPES.has((propertyType ?? "").trim().toLowerCase());

const buildReference = (raw: Record<string, unknown> | null) => {
  const candidate =
    readPath(raw, ["mandate", "number"]) ?? readPath(raw, ["settings", "reference"]) ?? null;
  if (candidate === null || candidate === undefined) return null;
  const text = String(candidate).trim();
  return /^\d{1,8}$/.test(text) ? text : null;
};

const sentence = (parts: Array<string | null>) => parts.filter((part): part is string => Boolean(part)).join(" ");

export const buildVitrinePosterContent = (input: {
  property: PropertyRow;
  listing: ListingRow | null;
  siteUrl: string;
}): VitrinePosterContentResult => {
  const { property, listing } = input;
  const errors: string[] = [];
  const warnings: string[] = [];
  const raw = asRecord(property.raw_payload);
  const legal = asRecord(property.legal);
  const transaction = inferListingTransactionKind(property.negotiation);
  const priceAmount = listing?.price_amount ?? asNumber(readPath(raw, ["price", "amount"]));
  const derived = buildPropertyDerivedFields(property, priceAmount);

  // --- Modèle selon le statut ---------------------------------------------
  const resolution = resolveVitrinePosterModel({
    availabilityStatus: property.availability_status,
    transaction,
  });
  const model = resolution.ok ? resolution.model : null;
  const modelLabel = resolution.ok ? resolution.label : null;
  const ribbon = model ? VITRINE_RIBBONS[model] : null;
  if (!resolution.ok) {
    errors.push(resolution.error);
  }
  // Vendu / loué : le QR doit mener à une page encore en ligne (bandeau
  // « Vendu » / « Loué », appel à l'estimation). Même règle que le site public.
  if (model && CLOSED_POSTER_MODELS.has(model)) {
    const pageOnline =
      Boolean(listing?.canonical_path) &&
      isDetailPageServed({
        availabilityStatus: property.availability_status,
        isPublished: listing?.is_published,
        publicationStatus: listing?.publication_status,
      });
    if (!pageOnline) {
      errors.push("La page publique de ce bien n'est plus en ligne : le QR mènerait à une page morte.");
    }
  }

  // --- En-tête de la carte -------------------------------------------------
  const headline = model ? VITRINE_POSTER_HEADLINES[model] : VITRINE_HEADLINE[transaction];

  const typeParts: string[] = [propertyTypeLabel(property.property_type).toUpperCase()];
  if (typeof derived.rooms.roomCount === "number" && derived.rooms.roomCount > 0) {
    typeParts[0] += ` ${plural(derived.rooms.roomCount, "PIÈCE", "PIÈCES")}`;
  }
  const headlineArea = derived.surfaces.livingArea ?? derived.surfaces.loiCarrezArea;
  if (typeof headlineArea === "number" && headlineArea > 0) {
    typeParts.push(formatArea(headlineArea));
  }
  const typeLine = typeParts.join(" · ");

  // Ville · quartier, sans code postal (décision du 21/10 : il allongeait la
  // ligne jusqu'à la faire passer sur deux lignes avec les quartiers composés).
  const city = (property.city ?? "Nice").trim();
  const quartier = (property.vitrine_quartier ?? "").trim();
  if (!quartier) {
    warnings.push("Quartier non renseigné sur la fiche vitrine : la ligne de localisation n'affiche que la ville.");
  }
  const locationLine = `${city.toUpperCase()}${quartier ? ` · ${quartier.toUpperCase()}` : ""}`;

  // --- Prix et mentions légales ---------------------------------------------
  const legalLines: string[] = [];
  let priceLine = "Prix sur demande";
  if (derived.price.kind === "sale") {
    if (typeof priceAmount !== "number" || priceAmount <= 0) {
      errors.push("Prix de vente absent dans SweepBright.");
    } else {
      priceLine = formatEuros(priceAmount);
    }
    const bearer = derived.price.feeChargeBearer;
    if (bearer === "vendor") {
      legalLines.push("Honoraires à la charge du vendeur");
    } else if (bearer === "buyer") {
      const percentage = asNumber(raw?.buyer_percentage);
      const feeCents = derived.price.feeAmountCents;
      const priceCents = toCents(priceAmount);
      if (percentage && percentage > 0) {
        legalLines.push(`Honoraires à la charge de l’acquéreur : ${formatPercent(percentage)} TTC`);
      } else {
        legalLines.push("Honoraires à la charge de l’acquéreur");
      }
      if (typeof feeCents === "number" && typeof priceCents === "number" && priceCents > feeCents) {
        legalLines.push(`Prix hors honoraires : ${formatEuros(fromCents(priceCents - feeCents))}`);
      } else {
        warnings.push("Honoraires acquéreur : montant non calculable, le prix hors honoraires n'est pas affiché.");
      }
    } else {
      errors.push("Charge des honoraires non renseignée dans SweepBright (ni vendeur ni acquéreur).");
    }
  } else {
    const rent = derived.price.rentIncludingChargesCents ?? derived.price.rentExcludingChargesCents;
    if (typeof rent !== "number") {
      errors.push("Loyer absent dans SweepBright.");
    } else {
      priceLine = `${formatEuros(fromCents(rent))}${NBSP}/ mois`;
      if (typeof derived.price.chargesProvisionCents === "number") {
        legalLines.push(
          `Loyer charges comprises, dont ${formatEuros(fromCents(derived.price.chargesProvisionCents))} de provisions sur charges`
        );
      } else {
        legalLines.push("Loyer charges comprises");
      }
    }
    if (typeof derived.price.securityDepositCents === "number") {
      legalLines.push(`Dépôt de garantie : ${formatEuros(fromCents(derived.price.securityDepositCents))}`);
    }
    if (typeof derived.price.totalTenantFeesCents === "number") {
      legalLines.push(`Honoraires locataire : ${formatEuros(fromCents(derived.price.totalTenantFeesCents))} TTC`);
    }
  }

  // --- Copropriété -----------------------------------------------------------
  const totalLots = asNumber(readPath(raw, ["building", "units_of_building"]));
  const residentialLots = asNumber(readPath(raw, ["building", "construction", "residential_lots"]));
  const annualCharges = asNumber(readPath(raw, ["price_yearly_budgeted_building_costs", "amount"]));
  const hasLots = (totalLots ?? residentialLots) !== null;
  const isCondo = hasLots || !isNonCondoType(property.property_type);

  if (transaction === "sale" && isCondo) {
    if (!hasLots) {
      errors.push("Copropriété : nombre de lots absent dans SweepBright (ou bien à marquer hors copropriété).");
    } else {
      const lots = totalLots ?? residentialLots;
      const line =
        typeof totalLots === "number" && typeof residentialLots === "number" && residentialLots < totalLots
          ? `Copropriété de ${plural(totalLots, "lot", "lots")}, dont ${plural(residentialLots, "lot d'habitation", "lots d’habitation")}`
          : `Copropriété de ${plural(lots as number, "lot", "lots")}`;
      legalLines.push(line);
    }
    if (typeof annualCharges === "number" && annualCharges > 0) {
      legalLines.push(`Charges courantes : ${formatEuros(annualCharges)}/an (quote-part)`);
    } else {
      errors.push("Copropriété : charges courantes annuelles absentes dans SweepBright.");
    }
    const regulations = asRecord(legal?.regulations);
    const litigation = regulations && "ongoing_litigation" in regulations ? regulations.ongoing_litigation : undefined;
    if (litigation === true) {
      legalLines.push("Procédure en cours (art. L721-1 CCH)");
    } else if (litigation === false) {
      legalLines.push("Aucune procédure en cours (art. L721-1 CCH)");
    } else {
      errors.push("Copropriété : « procédure en cours » non renseignée dans SweepBright (case à cocher oui/non).");
    }
  }

  // --- Points forts -----------------------------------------------------------
  const highlights = Array.isArray(property.vitrine_highlights)
    ? property.vitrine_highlights.filter((line): line is string => typeof line === "string" && line.trim().length > 0)
    : [];
  if (highlights.length < VITRINE_HIGHLIGHTS_MIN) {
    errors.push(
      `Points forts : ${highlights.length} ligne${highlights.length > 1 ? "s" : ""} saisie${highlights.length > 1 ? "s" : ""}, minimum ${VITRINE_HIGHLIGHTS_MIN} (bloc « Fiche vitrine » de la fiche du bien).`
    );
  }

  // --- Ligne de caractéristiques -------------------------------------------------
  const characteristics: string[] = [];
  if (typeof derived.surfaces.loiCarrezArea === "number" && derived.surfaces.loiCarrezArea > 0) {
    characteristics.push(`${formatArea(derived.surfaces.loiCarrezArea)} Carrez`);
  } else if (typeof derived.surfaces.livingArea === "number" && derived.surfaces.livingArea > 0) {
    characteristics.push(`${formatArea(derived.surfaces.livingArea)} habitables`);
  }
  if (typeof derived.surfaces.plotArea === "number" && derived.surfaces.plotArea > 0) {
    characteristics.push(`terrain de ${formatArea(derived.surfaces.plotArea)}`);
  }
  if (typeof derived.rooms.livingRooms === "number" && derived.rooms.livingRooms > 0) {
    characteristics.push(plural(derived.rooms.livingRooms, "pièce de vie", "pièces de vie"));
  }
  if (typeof derived.rooms.bedrooms === "number" && derived.rooms.bedrooms > 0) {
    characteristics.push(plural(derived.rooms.bedrooms, "chambre", "chambres"));
  }
  const bathrooms = asNumber(raw?.bathrooms) ?? property.bathrooms;
  if (typeof bathrooms === "number" && bathrooms > 0) {
    characteristics.push(plural(bathrooms, "salle de bains", "salles de bains"));
  }
  const showerRooms = asNumber(raw?.shower_rooms);
  if (typeof showerRooms === "number" && showerRooms > 0) {
    characteristics.push(plural(showerRooms, "salle de douche", "salles de douche"));
  }
  if (readPath(raw, ["features", "heating_cooling", "air_conditioning"]) === true) {
    characteristics.push("climatisation");
  }
  if (derived.amenities.hasElevator === true) characteristics.push("ascenseur");
  if (typeof derived.rooms.floor === "number" && derived.rooms.floor > 0 && typeof derived.rooms.totalFloors === "number") {
    if (derived.rooms.isTopFloor) {
      characteristics.push("dernier étage");
    } else if (derived.rooms.floor === derived.rooms.totalFloors - 1) {
      characteristics.push("avant-dernier étage");
    }
  }
  if (derived.amenities.hasBalcony === true) {
    characteristics.push(
      typeof derived.surfaces.balconyArea === "number" && derived.surfaces.balconyArea > 0
        ? `balcon de ${formatArea(derived.surfaces.balconyArea)}`
        : "balcon"
    );
  }
  if (derived.amenities.hasTerrace === true) {
    characteristics.push(
      typeof derived.surfaces.terraceArea === "number" && derived.surfaces.terraceArea > 0
        ? `terrasse de ${formatArea(derived.surfaces.terraceArea)}`
        : "terrasse"
    );
  }
  if (derived.amenities.seaView) characteristics.push("vue mer");
  if (derived.amenities.exposure) characteristics.push(`exposition ${derived.amenities.exposure.toLowerCase()}`);
  if (derived.amenities.hasParking === true) characteristics.push("parking");
  if (derived.amenities.hasCellar === true) characteristics.push("cave");
  // Espace insécable avant le point médian : une ligne ne commence jamais par « · ».
  const characteristicsLine = characteristics.join(`${NBSP}· `);

  // --- Référence (masquée si absente ou non numérique) --------------------------
  const reference = buildReference(raw);
  if (!reference) {
    warnings.push("Numéro de mandat absent ou non numérique dans SweepBright : la ligne « Référence » est masquée.");
  }

  // --- DPE ----------------------------------------------------------------------
  const energySnapshot = buildPropertyEnergySnapshot(property);
  const dpeStatus = resolveDpeStatus(energySnapshot.dpeLabel, energySnapshot.gesLabel);
  const energyRaw = asRecord(legal?.energy);
  const costMin = asNumber(readPath(energyRaw, ["estimated_energy_costs", "minimum", "amount"]));
  const costMax = asNumber(readPath(energyRaw, ["estimated_energy_costs", "maximum", "amount"]));
  const costYear = asNumber(readPath(energyRaw, ["estimated_energy_costs", "year"]));

  let energy: VitrineEnergyBlock = { kind: "text" };
  let dpeParagraph = "";
  if (dpeStatus.kind === "scales") {
    energy = {
      kind: "scales",
      energyClass: dpeStatus.energyClass,
      energyValue: energySnapshot.dpeValue,
      climateClass: dpeStatus.climateClass,
      climateValue: energySnapshot.gesValue,
    };
    const excessive = dpeStatus.energyClass === "F" || dpeStatus.energyClass === "G";
    let costSentence: string | null = null;
    if (typeof costMin === "number" && typeof costMax === "number") {
      costSentence = `Montant estimé des dépenses annuelles d’énergie pour un usage standard : entre ${formatEuros(costMin)} et ${formatEuros(costMax)} par an.`;
      if (typeof costYear === "number") {
        costSentence += ` Prix moyens des énergies indexés au 1er janvier ${costYear} (abonnements compris).`;
      } else {
        warnings.push("DPE : année de référence des prix de l'énergie absente dans SweepBright.");
      }
    } else {
      errors.push("DPE : fourchette des dépenses annuelles d’énergie absente dans SweepBright.");
    }
    dpeParagraph = sentence([
      dpeClassesSentence(dpeStatus.energyClass, dpeStatus.climateClass),
      excessive ? dpeExcessiveSentence(dpeStatus.energyClass) : null,
      costSentence,
      GEORISQUES_SENTENCE,
    ]);
    if (energySnapshot.dpeValue === null || energySnapshot.gesValue === null) {
      warnings.push("DPE : consommation (kWh/m²/an) ou émissions (kg CO₂/m²/an) absentes : la valeur n'est pas affichée à côté de la flèche.");
    }
  } else if (dpeStatus.kind === "blank") {
    dpeParagraph = sentence([DPE_BLANK_SENTENCE, GEORISQUES_SENTENCE]);
  } else if (dpeStatus.kind === "exempt") {
    dpeParagraph = sentence([DPE_EXEMPT_SENTENCE, GEORISQUES_SENTENCE]);
  } else {
    errors.push("DPE : classe énergie ou classe climat absente dans SweepBright.");
    dpeParagraph = GEORISQUES_SENTENCE;
  }

  // --- QR -----------------------------------------------------------------------
  const siteUrl = input.siteUrl.trim().replace(/\/$/, "");
  const canonicalPath = listing?.canonical_path ?? null;
  if (!siteUrl || !canonicalPath) {
    errors.push("Adresse publique de l'annonce introuvable (QR code).");
  }
  const qrUrl = siteUrl && canonicalPath ? `${siteUrl}${canonicalPath}` : "";

  return {
    content: {
      model,
      modelLabel,
      ribbon,
      headline,
      typeLine,
      locationLine,
      priceLine,
      legalLines,
      highlights,
      characteristicsLine,
      reference,
      energy,
      dpeParagraph,
      qrUrl,
      footer: VITRINE_FOOTER,
    },
    errors,
    warnings,
  };
};
