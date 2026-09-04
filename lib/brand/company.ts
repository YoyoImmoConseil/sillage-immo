/** Identité publique de l'agence — une seule source de vérité. */

export const SILLAGE_PHONE_RAW = "+33423450485";
export const SILLAGE_PHONE_DISPLAY = "+33 4 23 45 04 85";

export const SILLAGE_ADDRESS_STREET = "35 rue Arson";
export const SILLAGE_ADDRESS_POSTAL_CODE = "06300";
export const SILLAGE_ADDRESS_CITY = "Nice";
export const SILLAGE_ADDRESS_DISPLAY = "35 rue Arson, 06300 Nice";
export const SILLAGE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=35+rue+Arson%2C+06300+Nice";

/**
 * Section « équipe » de l'accueil. Masquée tant que les portraits de toute
 * l'équipe ne sont pas disponibles (deux cartes « Portrait à venir » en prod).
 * Repasser à true une fois les photos ajoutées dans l'admin.
 */
export const SHOW_HOME_TEAM_SECTION = false;

/** Email de contact public (RGPD, réclamations). */
export const SILLAGE_CONTACT_EMAIL = "yu@sillage-immo.com";

/**
 * Identité légale — source : fiche « SARL IMMO CONSEIL » (agent immobilier,
 * personne morale) dans MyNotary, relevée le 04/09/2026. À mettre à jour
 * ici uniquement ; les pages légales lisent ces constantes.
 */
export const SILLAGE_LEGAL = {
  legalName: "IMMO CONSEIL",
  tradeName: "Sillage Immo",
  legalForm: "Société à responsabilité limitée (SARL)",
  shareCapital: "8 003,57 €",
  siren: "344 290 705",
  rcs: "RCS Nice 344 290 705",
  vatNumber: "FR25 344 290 705",
  legalRepresentative: "Jacques Cassan, gérant",
  publicationDirector: "Yoann Uzzan, directeur",
  professionalCard: "CPI 0605 2018 000 036 059 — Transaction sur immeubles et fonds de commerce, Gestion immobilière",
  professionalCardIssuedAt: "25 septembre 2024",
  professionalCardIssuer: "CCI Nice Côte d'Azur",
  fundsHandlingTransaction: "Transaction : sans détention de fonds",
  fundsHandlingManagement: "Gestion : avec détention de fonds",
  financialGuarantee:
    "QBE Insurance (Europe), 110 Esplanade du Général de Gaulle, 92400 Courbevoie — montant garanti : 110 000 € (activité gestion)",
  liabilityInsurance:
    "AXA France IARD, 313 Terrasses de l'Arche, 92000 Nanterre — police n° 0000010283464104",
  mediator:
    "MCP – Médiation de la Consommation & Patrimoine, 12 square Desnouettes, 75015 Paris — www.mcpmediation.org",
  host: "Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com",
} as const;

/** Barème d'honoraires — à compléter (affiché sur /honoraires et exigé par l'arrêté du 10 janvier 2017). */
export const SILLAGE_FEES = {
  saleTiers: [
    { range: "[À COMPLÉTER — ex. jusqu'à 150 000 €]", fee: "[À COMPLÉTER — ex. 6 000 € TTC forfait]" },
    { range: "[À COMPLÉTER — ex. de 150 001 € à 500 000 €]", fee: "[À COMPLÉTER — ex. 5 % TTC]" },
    { range: "[À COMPLÉTER — ex. au-delà de 500 000 €]", fee: "[À COMPLÉTER — ex. 4 % TTC]" },
  ],
  saleNote: "Honoraires TTC, à la charge du vendeur sauf mention contraire sur l'annonce. Pourcentage calculé sur le prix de vente hors honoraires.",
  rentalTenant: "Honoraires à la charge du locataire (visite, constitution du dossier, rédaction du bail) : 10 € TTC / m² de surface habitable (zone tendue, plafond légal), auxquels s'ajoutent 3 € TTC / m² pour l'état des lieux d'entrée.",
  rentalLandlord: "[À COMPLÉTER — honoraires à la charge du bailleur (mise en location, gestion)]",
  updatedAt: "[À COMPLÉTER — date de mise à jour du barème]",
} as const;
