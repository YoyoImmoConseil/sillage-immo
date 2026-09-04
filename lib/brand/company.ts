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
 * Identité légale — à compléter avec les informations de la carte
 * professionnelle et du Kbis. Tant qu'un champ est « [À COMPLÉTER] », les
 * pages légales l'affichent tel quel : ne pas mettre en production sans les
 * renseigner.
 */
export const SILLAGE_LEGAL = {
  legalName: "[À COMPLÉTER — raison sociale]",
  legalForm: "[À COMPLÉTER — forme juridique]",
  shareCapital: "[À COMPLÉTER — capital social]",
  rcs: "[À COMPLÉTER — RCS Nice n°]",
  vatNumber: "[À COMPLÉTER — n° TVA intracommunautaire]",
  professionalCard: "[À COMPLÉTER — carte professionnelle n°, mention Transaction / Gestion]",
  professionalCardIssuer: "CCI Nice Côte d'Azur",
  fundsHandling: "[À COMPLÉTER — sans / avec détention de fonds]",
  financialGuarantee: "[À COMPLÉTER — organisme et montant de la garantie financière]",
  liabilityInsurance: "[À COMPLÉTER — assureur RC professionnelle]",
  publicationDirector: "Yoann Uzzan",
  mediator: "[À COMPLÉTER — médiateur de la consommation et site web]",
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
