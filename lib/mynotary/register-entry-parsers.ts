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
