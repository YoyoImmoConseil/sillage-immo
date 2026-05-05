/**
 * Privacy-first projection helper for buyer contact identity.
 *
 * The seller portal only exposes the visiting contact's initials. Format:
 *   - First letter (uppercase) of the first whitespace-separated word
 *   - First letter (uppercase) of the last whitespace-separated word
 *   - Single-word inputs => single initial
 *   - NULL / empty / whitespace-only => "—" (em dash placeholder)
 *
 * Mirrors the SQL function `public.compute_contact_initials(text)` shipped
 * in migration 20260610_023_property_visits.sql so admin and client paths
 * yield identical glyphs.
 */

const PLACEHOLDER = "—";

export const computeContactInitials = (
  name: string | null | undefined
): string => {
  if (name == null) return PLACEHOLDER;
  const trimmed = name.trim();
  if (trimmed.length === 0) return PLACEHOLDER;

  const parts = trimmed.split(/\s+/u).filter((part) => part.length > 0);
  if (parts.length === 0) return PLACEHOLDER;

  const first = parts[0];
  const last = parts[parts.length - 1];

  const firstInitial = [...first][0] ?? "";
  if (parts.length === 1) {
    return firstInitial.toLocaleUpperCase();
  }

  const lastInitial = [...last][0] ?? "";
  return `${firstInitial}${lastInitial}`.toLocaleUpperCase();
};
