/**
 * Fond de carte partagé par toutes les cartes Leaflet du site.
 *
 * Historique : les tuiles CARTO "voyager" exigent désormais une clé API et
 * affichent un filigrane "API KEY REQUIRED" sans elle. On repasse sur les
 * tuiles OpenStreetMap standard : gratuites, sans clé, attribution obligatoire.
 * Pour changer de fournisseur, ne modifier que ce fichier.
 */
export const MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAP_TILE_MAX_ZOOM = 19;
export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
