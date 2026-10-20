import {
  ADMIN_AVAILABILITY_STATUS_LABELS_FR,
  isAdminAvailabilityStatus,
  isPublicAvailabilityStatus,
} from "./canonical-types";

/**
 * Liste admin des biens : trois sections lisibles d'un coup d'œil.
 *
 * - `market`   : sur le marché (disponible, sous offre, sous compromis) — ce
 *                que le site publie.
 * - `pipeline` : en préparation (estimation en cours, prospect, statut
 *                inconnu ou absent) — le travail en cours.
 * - `closed`   : terminés (vendu, loué, retiré, supprimé dans SweepBright).
 */
export type AdminPropertySection = "market" | "pipeline" | "closed";

export const ADMIN_PROPERTY_SECTIONS: ReadonlyArray<{
  key: AdminPropertySection;
  title: string;
  description: string;
}> = [
  { key: "market", title: "Sur le marché", description: "Disponibles, sous offre ou sous compromis : les biens publiés sur le site." },
  { key: "pipeline", title: "En préparation", description: "Estimations en cours, prospects et biens en attente de mise en marché." },
  { key: "closed", title: "Terminés", description: "Vendus, loués, retirés ou supprimés dans SweepBright." },
];

const CLOSED_STATUSES = new Set(["sold", "rented", "let", "withdrawn", "deleted", "archived"]);

export const resolveAdminPropertySection = (availabilityStatus: string | null | undefined): AdminPropertySection => {
  const status = typeof availabilityStatus === "string" ? availabilityStatus.trim().toLowerCase() : "";
  if (isPublicAvailabilityStatus(status)) return "market";
  if (CLOSED_STATUSES.has(status)) return "closed";
  return "pipeline";
};

export const formatAdminAvailabilityLabel = (availabilityStatus: string | null | undefined): string => {
  const status = typeof availabilityStatus === "string" ? availabilityStatus.trim().toLowerCase() : "";
  if (!status) return "Statut non renseigné";
  if (isAdminAvailabilityStatus(status)) return ADMIN_AVAILABILITY_STATUS_LABELS_FR[status];
  if (status === "let") return "Loué";
  if (status === "archived") return "Archivé";
  return status;
};
