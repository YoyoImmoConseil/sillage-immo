import { COLORS } from "./poster-layout";

/**
 * Fiche vitrine — modèle d'affiche selon le statut du bien sur le site
 * (`properties.availability_status`, recopié de SweepBright par la synchro).
 *
 * Quatre rubans d'angle (sous offre, sous compromis, vendu, loué) et deux
 * modèles sans ruban (à vendre, à louer). Tout autre statut est bloquant :
 * on n'imprime pas une affiche dont on ne sait pas quoi dire.
 */
export type VitrinePosterModel = "sale" | "under_offer" | "under_contract" | "sold" | "rental" | "rented";

export type VitrineRibbonSpec = {
  text: string;
  /** Corps en points PDF (px Canva × 0,7502). */
  fontSize: number;
  /** Interlettrage en points PDF. */
  letterSpacing: number;
  bandColor: string;
  inkColor: string;
};

export const VITRINE_POSTER_MODEL_LABELS: Record<VitrinePosterModel, string> = {
  sale: "À vendre",
  under_offer: "Sous offre",
  under_contract: "Sous compromis",
  sold: "Vendu",
  rental: "À louer",
  rented: "Loué",
};

export const VITRINE_POSTER_HEADLINES: Record<VitrinePosterModel, string> = {
  sale: "Bien à vendre",
  under_offer: "Bien à vendre",
  under_contract: "Bien à vendre",
  sold: "Bien vendu",
  rental: "Bien à louer",
  rented: "Bien loué",
};

/** Cotes Canva (px) : corps 40 / 29 / 54 / 54, interlettrage 4 / 3 / 8 / 8. */
export const VITRINE_RIBBONS: Record<VitrinePosterModel, VitrineRibbonSpec | null> = {
  sale: null,
  rental: null,
  under_offer: { text: "SOUS OFFRE", fontSize: 30, letterSpacing: 3, bandColor: COLORS.sand, inkColor: COLORS.navy },
  under_contract: { text: "SOUS COMPROMIS", fontSize: 21.75, letterSpacing: 2.25, bandColor: COLORS.navy, inkColor: COLORS.sand },
  sold: { text: "VENDU", fontSize: 40.5, letterSpacing: 6, bandColor: COLORS.navy, inkColor: COLORS.sand },
  rented: { text: "LOUÉ", fontSize: 40.5, letterSpacing: 6, bandColor: COLORS.navy, inkColor: COLORS.sand },
};

const VITRINE_POSTER_MODELS: ReadonlySet<string> = new Set(Object.keys(VITRINE_POSTER_MODEL_LABELS));

export const isVitrinePosterModel = (value: unknown): value is VitrinePosterModel =>
  typeof value === "string" && VITRINE_POSTER_MODELS.has(value);

/** Les modèles dont la page publique n'est plus une annonce active. */
export const CLOSED_POSTER_MODELS: ReadonlySet<VitrinePosterModel> = new Set(["sold", "rented"]);

export type VitrinePosterModelResolution =
  | { ok: true; model: VitrinePosterModel; label: string }
  | { ok: false; error: string };

const normalize = (value: string | null | undefined) => (typeof value === "string" ? value.trim().toLowerCase() : "");

/**
 * Correspondance validée le 22/10/2026 :
 * - vente : available → À vendre ; option → Sous offre ; agreement et
 *   under_contract → Sous compromis ; sold → Vendu.
 * - location : available → À louer ; rented → Loué ; under_contract bloquant.
 * - prospect, withdrawn, deleted, statut absent ou inconnu : bloquant.
 */
export const resolveVitrinePosterModel = (input: {
  availabilityStatus: string | null | undefined;
  transaction: "sale" | "rental";
}): VitrinePosterModelResolution => {
  const status = normalize(input.availabilityStatus);
  const ok = (model: VitrinePosterModel): VitrinePosterModelResolution => ({
    ok: true,
    model,
    label: VITRINE_POSTER_MODEL_LABELS[model],
  });

  if (!status) {
    return { ok: false, error: "Statut du bien absent dans SweepBright : aucun modèle d'affiche ne peut être choisi." };
  }
  switch (status) {
    case "prospect":
      return { ok: false, error: "Bien en estimation / prospect : pas encore en marché, pas d'affiche vitrine." };
    case "withdrawn":
      return { ok: false, error: "Mandat retiré : pas d'affiche vitrine." };
    case "deleted":
      return { ok: false, error: "Bien supprimé dans SweepBright : pas d'affiche vitrine." };
    default:
      break;
  }

  if (input.transaction === "rental") {
    switch (status) {
      case "available":
        return ok("rental");
      case "rented":
      case "let":
        return ok("rented");
      case "under_contract":
        return { ok: false, error: "Location au statut SweepBright « under_contract » : modèle non prévu, à trancher." };
      case "option":
      case "agreement":
        return { ok: false, error: `Location au statut SweepBright « ${status} » : modèle non prévu, à trancher.` };
      case "sold":
        return { ok: false, error: "Location au statut « vendu » : incohérent, vérifier la fiche SweepBright." };
      default:
        return { ok: false, error: `Statut SweepBright « ${status} » non prévu pour une location.` };
    }
  }

  switch (status) {
    case "available":
      return ok("sale");
    case "option":
      return ok("under_offer");
    case "agreement":
    case "under_contract":
      return ok("under_contract");
    case "sold":
      return ok("sold");
    case "rented":
    case "let":
      return { ok: false, error: "Vente au statut « loué » : incohérent, vérifier la fiche SweepBright." };
    default:
      return { ok: false, error: `Statut SweepBright « ${status} » non prévu pour une vente.` };
  }
};
