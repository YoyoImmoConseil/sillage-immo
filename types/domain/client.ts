export type ClientProjectType = "seller" | "buyer" | "rental" | "wealth";
export type ClientProjectCreatedFrom = "seller_lead" | "buyer_lead" | "crm_property" | "admin_manual";
export type SellerProjectEntryChannel = "sillage_tunnel" | "crm_direct" | "admin_created";
export type SellerProjectStatus =
  | "estimation_realisee"
  | "a_contacter"
  | "rdv_estimation_planifie"
  | "estimation_physique_realisee"
  | "mandat_en_preparation"
  | "mandat_signe"
  | "bien_en_commercialisation"
  | "bien_sous_offre"
  | "bien_vendu"
  | "projet_suspendu";
export type MandateStatus = "none" | "draft" | "signed" | "terminated";
export type ProjectPropertyRelationshipType =
  | "seller_subject_property"
  | "rental_managed_property"
  | "buyer_target_property"
  | "archived_relation";

export const SELLER_PROJECT_STATUS_LABELS: Record<SellerProjectStatus, string> = {
  estimation_realisee: "Estimation réalisée",
  a_contacter: "À contacter",
  rdv_estimation_planifie: "RDV estimation planifié",
  estimation_physique_realisee: "Estimation physique réalisée",
  mandat_en_preparation: "Mandat en préparation",
  mandat_signe: "Mandat signé",
  bien_en_commercialisation: "Bien en commercialisation",
  bien_sous_offre: "Bien sous offre",
  bien_vendu: "Bien vendu",
  projet_suspendu: "Projet suspendu",
};

export const MANDATE_STATUS_LABELS: Record<MandateStatus, string> = {
  none: "Aucun",
  draft: "Brouillon",
  signed: "Signé",
  terminated: "Résilié",
};

export const CLIENT_PROJECT_TYPE_LABELS: Record<ClientProjectType, string> = {
  seller: "Vente",
  buyer: "Achat",
  rental: "Location",
  wealth: "Patrimoine",
};

export const isClientProjectType = (value: string): value is ClientProjectType => {
  return value === "seller" || value === "buyer" || value === "rental" || value === "wealth";
};
