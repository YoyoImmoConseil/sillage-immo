import type { AppLocale } from "./config";

export type LocalizedTextMap = Partial<Record<AppLocale, string | null | undefined>>;

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const toText = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getLocalizedFieldMap = (root: unknown, field: string) => {
  const record = asRecord(root);
  if (!record) return null;

  const candidates = [
    asRecord(record.localized_content)?.[field],
    asRecord(record.translations)?.[field],
    asRecord(record.i18n)?.[field],
  ];

  for (const candidate of candidates) {
    const candidateRecord = asRecord(candidate);
    if (candidateRecord) return candidateRecord;
  }

  return null;
};

export const resolveLocalizedText = (input: {
  locale: AppLocale;
  field: string;
  fallback?: string | null;
  sources: unknown[];
}) => {
  for (const source of input.sources) {
    const fieldMap = getLocalizedFieldMap(source, input.field);
    if (!fieldMap) continue;

    const exact = toText(fieldMap[input.locale]);
    if (exact) return exact;

    const french = toText(fieldMap.fr);
    if (french) return french;
  }

  return input.fallback ?? null;
};

export const mergeLocalizedText = (
  current: unknown,
  field: string,
  translations?: LocalizedTextMap
): Record<string, unknown> => {
  const currentRecord = asRecord(current) ?? {};
  const localizedContent = asRecord(currentRecord.localized_content) ?? {};
  const currentFieldTranslations = asRecord(localizedContent[field]) ?? {};

  if (!translations) {
    return currentRecord;
  }

  const nextFieldTranslations: Record<string, unknown> = { ...currentFieldTranslations };
  for (const [locale, value] of Object.entries(translations)) {
    const normalized = toText(value);
    if (normalized) {
      nextFieldTranslations[locale] = normalized;
    } else {
      delete nextFieldTranslations[locale];
    }
  }

  const nextLocalizedContent = {
    ...localizedContent,
    [field]: nextFieldTranslations,
  };

  if (Object.keys(nextFieldTranslations).length === 0) {
    delete nextLocalizedContent[field];
  }

  return {
    ...currentRecord,
    localized_content: nextLocalizedContent,
  };
};
