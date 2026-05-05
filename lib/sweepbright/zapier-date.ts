/**
 * Parser for the pretty-printed datetime format Zapier surfaces in the
 * SweepBright "New Visit Scheduled" trigger output.
 *
 * Sample input (verified on webhook.site, 5 May 2026):
 *   "Monday, 23-Feb-26 13:00:00 UTC"
 *
 * The SweepBright Zapier app does not expose a raw ISO 8601 variant for
 * `visit_details.started_at` / `ended_at`, so we parse this format strictly
 * server-side rather than adding a Zapier Formatter step (cleaner, no
 * extra Zapier task, full control over edge cases).
 *
 * Returns a UTC `Date`, or `null` when the input is unparseable. Never
 * throws: callers branch on the null case so a malformed payload triggers
 * a 400 with a clear error message rather than a 500.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const DATE_REGEX =
  /^[A-Za-z]+,\s+(\d{1,2})-([A-Z][a-z]{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+UTC$/;

export const parseSweepBrightZapierDate = (
  raw: string | null | undefined
): Date | null => {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const match = trimmed.match(DATE_REGEX);
  if (!match) return null;

  const [, dayStr, monthStr, yyStr, hhStr, mmStr, ssStr] = match;
  const monthIndex = MONTHS.indexOf(
    monthStr as (typeof MONTHS)[number]
  );
  if (monthIndex < 0) return null;

  const day = Number.parseInt(dayStr, 10);
  const yy = Number.parseInt(yyStr, 10);
  const hh = Number.parseInt(hhStr, 10);
  const mm = Number.parseInt(mmStr, 10);
  const ss = Number.parseInt(ssStr, 10);

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(yy) ||
    !Number.isFinite(hh) ||
    !Number.isFinite(mm) ||
    !Number.isFinite(ss)
  ) {
    return null;
  }
  if (day < 1 || day > 31 || hh > 23 || mm > 59 || ss > 59) return null;

  const year = 2000 + yy;
  const date = new Date(Date.UTC(year, monthIndex, day, hh, mm, ss));
  if (Number.isNaN(date.getTime())) return null;

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const parseSweepBrightZapierDateToIso = (
  raw: string | null | undefined
): string | null => {
  const date = parseSweepBrightZapierDate(raw);
  return date ? date.toISOString() : null;
};
