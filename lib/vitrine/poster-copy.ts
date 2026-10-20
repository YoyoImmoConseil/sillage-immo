/**
 * Fiche vitrine — textes constants de l'affiche (pied de page, QR, titres).
 * Une seule source pour la raison sociale : SARL, comme sur MyNotary.
 */

export const VITRINE_FOOTER =
  "Sillage Immo · IMMO CONSEIL, SARL au capital de 8 003,57 € · 35 rue Arson, 06300 Nice · 04 23 45 04 85 · " +
  "RCS Nice 344 290 705 · Carte professionnelle CPI 0605 2018 000 036 059 délivrée par la CCI Nice Côte d’Azur · " +
  "Garantie financière QBE 110 000 € · Barème des honoraires consultable en agence et sur sillage-immo.com";

export const VITRINE_QR_CAPTION = "SCANNEZ · FICHE & VISITE 3D";
export const VITRINE_DPE_TITLE = "PERFORMANCE ÉNERGÉTIQUE ET CLIMATIQUE";
export const VITRINE_ENERGY_SCALE_LABEL = "Classe énergie";
export const VITRINE_CLIMATE_SCALE_LABEL = "Classe climat (gaz à effet de serre)";

export const VITRINE_HEADLINE = {
  sale: "Bien à vendre",
  rental: "Bien à louer",
} as const;

export const VITRINE_PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: "Appartement",
  flat: "Appartement",
  studio: "Studio",
  duplex: "Duplex",
  penthouse: "Penthouse",
  loft: "Loft",
  house: "Maison",
  villa: "Villa",
  townhouse: "Maison de ville",
  land: "Terrain",
  parking: "Parking",
  garage: "Garage",
  office: "Bureaux",
  commercial: "Local commercial",
  retail: "Local commercial",
  building: "Immeuble",
  warehouse: "Entrepôt",
};

/** Types de biens qui ne sont jamais en copropriété par nature. */
export const NON_CONDO_PROPERTY_TYPES = new Set(["house", "villa", "townhouse", "land", "building", "warehouse"]);
