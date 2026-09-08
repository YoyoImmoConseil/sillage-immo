/**
 * Frise des six étapes de vente affichée dans l'espace vendeur — les mêmes
 * que la méthode présentée sur l'accueil (Estimation → Stratégie → Mise en
 * valeur → Diffusion → Qualification → Signature). Calculée à partir du
 * statut du projet, du mandat et des jalons datés ; aucune écriture en base.
 */

export type SellerJourneyStepKey =
  | "estimation"
  | "strategy"
  | "staging"
  | "marketing"
  | "qualification"
  | "signature";

export type SellerJourneyStepState = "done" | "current" | "upcoming";

export type SellerJourneyStep = {
  key: SellerJourneyStepKey;
  state: SellerJourneyStepState;
  /** Date ISO du jalon quand elle est connue (mandat, offre, compromis, acte). */
  at: string | null;
};

export type SellerJourneyInput = {
  projectStatus: string | null | undefined;
  mandateStatus: string | null | undefined;
  hasValuation: boolean;
  milestones: {
    mandateSignedAt: string | null;
    offerReceivedAt: string | null;
    preliminarySaleSignedAt: string | null;
    deedSignedAt: string | null;
  };
};

const STATUS_RANK: Record<string, number> = {
  draft: 0,
  active: 0,
  estimation_realisee: 1,
  valuation_ready: 1,
  mandate_signed: 2,
  listing_live: 3,
  sold: 6,
  archived: 6,
};

export const computeSellerJourney = (input: SellerJourneyInput): SellerJourneyStep[] => {
  const status = (input.projectStatus ?? "").toLowerCase();
  const rank = STATUS_RANK[status] ?? 0;
  const m = input.milestones;

  const deedDone = Boolean(m.deedSignedAt) || status === "sold";
  const preliminaryDone = deedDone || Boolean(m.preliminarySaleSignedAt);
  const offerDone = preliminaryDone || Boolean(m.offerReceivedAt);
  const listingLive = offerDone || rank >= 3;
  const mandateDone =
    listingLive || Boolean(m.mandateSignedAt) || input.mandateStatus === "signed" || rank >= 2;
  const valuationDone = mandateDone || input.hasValuation || rank >= 1;

  // Nombre d'étapes accomplies, dans l'ordre de la méthode.
  const doneCount = [valuationDone, mandateDone, listingLive, offerDone, preliminaryDone, deedDone].filter(
    Boolean
  ).length;

  const keys: SellerJourneyStepKey[] = [
    "estimation",
    "strategy",
    "staging",
    "marketing",
    "qualification",
    "signature",
  ];
  const dates: Array<string | null> = [
    null,
    m.mandateSignedAt,
    null,
    m.offerReceivedAt,
    m.preliminarySaleSignedAt,
    m.deedSignedAt,
  ];

  return keys.map((key, index) => ({
    key,
    at: dates[index] ?? null,
    state: index < doneCount ? "done" : index === doneCount ? "current" : "upcoming",
  }));
};

/** Événements d'historique qui parlent au client ; le reste est du bruit technique. */
const CLIENT_FACING_EVENTS = new Set([
  "client_invitation.accepted",
  "project_property.linked_from_estimation",
  "project_property.linked",
  "valuation.recorded",
  "advisor.assigned",
  "seller_project.created_from_lead",
]);

/**
 * Historique lisible : on ne garde que les événements compréhensibles par
 * le client, une seule fois chacun (le plus récent), dans l'ordre reçu.
 */
export const filterClientFacingEvents = <T extends { eventName: string }>(events: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const event of events) {
    if (!CLIENT_FACING_EVENTS.has(event.eventName)) continue;
    const dedupeKey = event.eventName.startsWith("project_property.")
      ? "project_property"
      : event.eventName;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push(event);
  }
  return out;
};
