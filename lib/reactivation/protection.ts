/**
 * Règle permanente (Yoann, 06/11/2026) : aucune campagne de relance ne touche
 * un client qui a signé un mandat, un avenant de mandat ou un compromis dans
 * les 12 derniers mois glissants, quel que soit son rôle (vendeur, bailleur,
 * acquéreur). Les dossiers archivés comptent. Le point de départ est la date
 * de signature du contrat.
 *
 * Partie pure (testable) : quels contrats et rôles MyNotary protègent, et
 * comment on reconnaît une personne protégée (e-mail normalisé, sinon
 * nom + prénom normalisés).
 */

export const PROTECTION_WINDOW_DAYS = 365;

/** Rôles MyNotary dont la signature protège la personne. */
export const PROTECTED_ROLES: ReadonlySet<string> = new Set(["VENDEUR", "BAILLEUR", "ACQUEREUR"]);

/** Modèles de contrat qui protègent : mandats (vente, location, gestion, recherche, co-exclusif), avenants de mandat, compromis, promesses. */
export const isProtectingContractModel = (model: string | null | undefined): boolean => {
  const m = (model ?? "").toUpperCase();
  if (!m) return false;
  return m.includes("MANDAT") || m.includes("COMPROMIS") || m.includes("PROMESSE");
};

export const normalizeProtectedEmail = (email: string | null | undefined): string | null => {
  const value = (email ?? "").trim().toLowerCase();
  return value.includes("@") ? value : null;
};

const stripAccents = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "");

const simpleToken = (value: string | null | undefined) =>
  stripAccents(value ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

/**
 * Clé « nom|prénom » : nom de famille complet (sans accents ni ponctuation)
 * et premier prénom seulement (MyNotary stocke souvent « Jean, Pierre, Marie »
 * quand SweepBright n'a que « Jean »).
 */
export const normalizeProtectedName = (lastName: string | null | undefined, firstName: string | null | undefined): string | null => {
  const last = simpleToken(lastName);
  const first = simpleToken((firstName ?? "").split(/[,\s-]+/)[0]);
  if (last.length < 3 || first.length < 2) return null;
  return `${last}|${first}`;
};

export type ProtectionIndex = {
  emails: Set<string>;
  names: Set<string>;
  /** Date de la dernière synchronisation connue (null : jamais synchronisé). */
  syncedAt: Date | null;
  /** Nombre de personnes protégées dans la fenêtre. */
  size: number;
};

export const isContactProtected = (
  contact: { email: string | null | undefined; first_name?: string | null; last_name?: string | null },
  index: ProtectionIndex
): boolean => {
  const email = normalizeProtectedEmail(contact.email);
  if (email && index.emails.has(email)) return true;
  const name = normalizeProtectedName(contact.last_name, contact.first_name);
  return Boolean(name && index.names.has(name));
};

/** Borne basse de la fenêtre glissante. */
export const protectionWindowStart = (now: Date, days = PROTECTION_WINDOW_DAYS): Date =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
