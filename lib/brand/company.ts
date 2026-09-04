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
