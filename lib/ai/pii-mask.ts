// Free-text PII masking for conversation content stored in ai_messages.
//
// Goal:
//   The agency LLM stack ingests user-written messages (home assistant
//   chat, seller chat) that can contain emails, phone numbers, IBAN,
//   etc. We want to keep enough signal to detect topics/trends without
//   leaking raw PII to anyone reading the database, the audit_log or
//   downstream embeddings.
//
//   The redaction is intentionally simple (regex-based) and biased
//   toward false-positives: missing one occurrence is worse than over-
//   masking. The structured ai_conversations.metadata still carries the
//   real lead_id / seller_lead_id when applicable; the raw text never
//   needs to.

const EMAIL_RE = /[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g;

// French phone numbers in the wild: 06 12 34 56 78, 06.12.34.56.78,
// 06-12-34-56-78, +33 6 12 34 56 78, 0033 612 345 678. The pattern
// stays generous (any 10+ digit run with separators) to catch
// realistic variants without trying to be a fully spec-compliant
// E.164 parser.
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{1,4}\)?[\s.\-]?){2,5}\d{2,4}/g;

const isLikelyPhone = (candidate: string) => {
  const digits = candidate.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

export const maskPiiInText = (input: string): string => {
  if (typeof input !== "string" || input.length === 0) return input;

  let masked = input.replace(EMAIL_RE, "[email masqué]");

  masked = masked.replace(PHONE_RE, (match) => {
    if (!isLikelyPhone(match)) return match;
    const leading = match.match(/^\s+/)?.[0] ?? "";
    const trailing = match.match(/\s+$/)?.[0] ?? "";
    return `${leading}[téléphone masqué]${trailing}`;
  });

  return masked;
};

export type PiiMaskMeta = {
  masking_version: "basic-v1";
  email_masked: boolean;
  phone_masked: boolean;
};

export const maskPiiWithMeta = (
  input: string
): { text: string; meta: PiiMaskMeta } => {
  const text = maskPiiInText(input);
  return {
    text,
    meta: {
      masking_version: "basic-v1",
      email_masked: text.includes("[email masqué]"),
      phone_masked: text.includes("[téléphone masqué]"),
    },
  };
};
