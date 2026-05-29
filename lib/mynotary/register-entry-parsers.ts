// Pure parsers for MyNotary register entry free-form fields.
// Kept side-effect-free (no `server-only`) so they can be exercised
// by Vitest and reused outside the backfill service.

// Register entries don't expose a structured signedAt; the date is
// embedded inside the free-form `observations` text in DD/MM/YYYY
// format ("Date de signature du mandat : 07/04/2026"). We do a
// best-effort parse here so the backfilled KPIs land on the actual
// signature day rather than on the day MyNotary recorded the entry.
const SIGNATURE_DATE_RE =
  /date de signature[^:]*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i;

export const parseSignedAtFromObservations = (
  observations: string | undefined | null
): string | null => {
  if (!observations) return null;
  const match = SIGNATURE_DATE_RE.exec(observations);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  // Anchor to noon UTC so the timestamp falls on the same calendar
  // day in every common TZ (Europe/Paris in particular).
  const iso = `${year}-${month}-${day}T12:00:00.000Z`;
  return Number.isFinite(Date.parse(iso)) ? iso : null;
};

// Register entries ship the property as free-form text in `biens`,
// typically formatted as
//   "Typologie : Appartement - 52 Avenue de la Californie, Nice (06200), France"
//   "Type : Maison — 12 Rue Foo, Paris (75009), France"
// Multi-property mandates can list several biens separated by line
// breaks. We extract the first plausible address so the auto-matcher
// can perform an address-based lookup without an extra GET /operations
// roundtrip.
const TYPOLOGIE_PREFIX_RE = /^\s*(?:typ[eo]logie|type)\s*:\s*[^\-—]+[\-—]\s*/i;

export const parseAddressFromBiens = (
  biens: string | undefined | null
): string | null => {
  if (!biens) return null;
  const firstLine = biens
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return null;
  const stripped = firstLine.replace(TYPOLOGIE_PREFIX_RE, "").trim();
  if (stripped.length === 0) return null;
  // Require at least one digit (street number or postal code) to
  // filter out garbage labels — we don't want to ship a bare
  // "Appartement" as an address.
  if (!/\d/.test(stripped)) return null;
  return stripped;
};

// Operations (`GET /operations`) carry a free-form `label` that
// concatenates the property address with seller/buyer placeholders,
// e.g.
//   "8 Boulevard de Riquier, Nice (06300), FranceNom vendeurNom acquéreur"
//   "N°169 / 2 Boulevard Jean-Baptiste Vérany, Nice, France (06300) / SCI NONO / Nom acquéreur"
// We extract the address-looking chunk (street + city + postal code,
// ending at "France") so the auto-matcher can run an address lookup
// without a per-operation `GET /operations/{id}` roundtrip.
const ADDRESS_IN_LABEL_RE =
  /(\d{1,4}[^,/]*,\s*[^,/]+(?:\s*\(\d{5}\))?,?\s*France(?:\s*\(\d{5}\))?)/i;

export const parseAddressFromOperationLabel = (
  label: string | undefined | null
): string | null => {
  if (!label) return null;
  // Strip a leading register-number prefix like "N°169 / ".
  const cleaned = label.replace(/^\s*N°\s*\d+\s*\/\s*/i, "").trim();
  const match = ADDRESS_IN_LABEL_RE.exec(cleaned);
  if (match && match[1]) {
    return match[1].replace(/\s+/g, " ").trim();
  }
  // Fallback: take everything up to and including the first "France".
  const idx = cleaned.toLowerCase().indexOf("france");
  if (idx > 0) {
    const slice = cleaned.slice(0, idx + "france".length).trim();
    if (/\d/.test(slice)) return slice.replace(/\s+/g, " ").trim();
  }
  return null;
};

// Register entries ship the people who signed the contract as free-form
// text in `mandants`, typically formatted as
//   "Monsieur LEVI Mickaël Roland - 81 Rue Saint-Lazare, Paris (75009), France\n
//    Madame UZZAN Vanessa Ketty - 81 Rue Saint-Lazare, Paris (75009), France"
// Multi-signer mandates list each person on its own line.
// We extract a list of normalized "NOM Prénom" strings so the auto-
// matcher can fuzz-match them against `seller_leads.full_name`.
const CIVILITY_PREFIX_RE =
  /^\s*(monsieur|madame|mademoiselle|m\.|mme|mlle|me|maître|maitre|dr|docteur|sci|sasu?|sarl|sa|gie|eurl|sci|s\.c\.i\.?)\s+/i;

export const parseSellerNamesFromMandants = (
  mandants: string | undefined | null
): string[] => {
  if (!mandants) return [];
  const lines = mandants
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const names: string[] = [];
  for (const line of lines) {
    // Drop the trailing address (everything after the first " - "
    // or " — " separator).
    const beforeAddress = line.split(/\s+[-—]\s+/)[0]?.trim() ?? line;
    if (!beforeAddress) continue;
    // Strip the leading civility / legal-form prefix.
    const withoutCivility = beforeAddress.replace(CIVILITY_PREFIX_RE, "").trim();
    if (withoutCivility.length === 0) continue;
    // Re-collapse multiple whitespaces.
    const normalized = withoutCivility.replace(/\s+/g, " ").trim();
    if (normalized.length === 0) continue;
    names.push(normalized);
  }
  // Dedup, preserve order.
  return Array.from(new Set(names));
};

// `RegisterEntry.status` semantics (cf. MyNotary OpenAPI):
//   - "VALIDATED": the contract has been signed by every party.
//   - "RESERVED" : the entry exists (number reserved) but the
//                  signature flow is in progress and may still be
//                  cancelled / relaunched. The `observations` text
//                  lists the launches and cancellations.
//   - "CLOSED"   : the entry was abandoned (signature flow cancelled,
//                  contract archived).
//
// We must only treat VALIDATED entries (or entries whose observations
// already record a confirmed signature date) as actually signed —
// otherwise the dashboard counts mandates that are merely "en cours
// de signature".
export const isEntrySigned = (entry: {
  status?: string;
  observations?: string | null;
}): boolean => {
  if (entry.status === "VALIDATED") return true;
  // Belt and suspenders: if the observations text already carries a
  // confirmed "Date de signature : DD/MM/YYYY" line, treat the entry
  // as signed even when the status is missing — this lets us keep
  // tolerating the spec's slight ambiguity around CLOSED entries.
  return parseSignedAtFromObservations(entry.observations ?? null) !== null;
};
