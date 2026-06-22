export type TransactionBusinessType = "sale" | "rental";

export type TransactionStatus =
  | "prospect"
  | "mandate"
  | "offer"
  | "compromis"
  | "acte"
  | "cancelled";

export type TransactionSource = "manual" | "sweepbright" | "mynotary";

export type HonorairesSource = "sweepbright" | "manual" | "adjusted" | "mynotary";

export const TRANSACTION_STATUSES: TransactionStatus[] = [
  "prospect",
  "mandate",
  "offer",
  "compromis",
  "acte",
  "cancelled",
];

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  prospect: "Prospect",
  mandate: "Mandat",
  offer: "Offre",
  compromis: "Compromis",
  acte: "Acte authentique",
  cancelled: "Annulée",
};

export const HONORAIRES_SOURCE_LABELS: Record<HonorairesSource, string> = {
  sweepbright: "SweepBright",
  manual: "Saisie manuelle",
  adjusted: "Ajustement",
  mynotary: "MyNotary",
};

export type TransactionPartyInput = {
  contactIdentityId?: string | null;
  clientProfileId?: string | null;
  externalName?: string | null;
  externalEmail?: string | null;
  sharePercent?: number | null;
};

export type TransactionSellerInput = TransactionPartyInput & {
  sellerLeadId?: string | null;
};

export type TransactionBuyerInput = TransactionPartyInput & {
  buyerLeadId?: string | null;
  isExternal?: boolean;
};
