import "server-only";

import type { AppLocale } from "@/lib/i18n/config";
import {
  mergeLocalizedText,
  resolveLocalizedText,
  type LocalizedTextMap,
} from "@/lib/i18n/localized-content";
import { ADMIN_TEAM_TITLES, type AdminTeamTitle } from "@/types/domain/admin";

export type AdminProfileMetadata = {
  title: AdminTeamTitle | null;
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bookingUrl: string | null;
  bioTranslations: Partial<Record<AppLocale, string | null | undefined>>;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
};

const toStringOrNull = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const countWords = (value: string) => {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
};

export const parseAdminProfileMetadata = (value: unknown): AdminProfileMetadata => {
  const metadata = asRecord(value);
  const rawTitle = toStringOrNull(metadata?.title);
  return {
    title:
      rawTitle && ADMIN_TEAM_TITLES.includes(rawTitle as AdminTeamTitle)
        ? (rawTitle as AdminTeamTitle)
        : null,
    phone: toStringOrNull(metadata?.phone),
    bio: toStringOrNull(metadata?.bio),
    avatarUrl: toStringOrNull(metadata?.avatar_url),
    bookingUrl: toStringOrNull(metadata?.booking_url),
    bioTranslations: {
      fr: resolveLocalizedText({ locale: "fr", field: "bio", fallback: null, sources: [metadata] }) ?? undefined,
      en: resolveLocalizedText({ locale: "en", field: "bio", fallback: null, sources: [metadata] }) ?? undefined,
      es: resolveLocalizedText({ locale: "es", field: "bio", fallback: null, sources: [metadata] }) ?? undefined,
      ru: resolveLocalizedText({ locale: "ru", field: "bio", fallback: null, sources: [metadata] }) ?? undefined,
    },
  };
};

export const buildAdminProfileMetadata = (
  current: unknown,
  patch: Partial<AdminProfileMetadata> & {
    bioTranslations?: LocalizedTextMap;
  }
): Record<string, unknown> => {
  const currentMetadata = asRecord(current) ?? {};
  const baseMetadata = {
    ...currentMetadata,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
    ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
    ...(patch.bookingUrl !== undefined ? { booking_url: patch.bookingUrl } : {}),
  };

  return mergeLocalizedText(baseMetadata, "bio", patch.bioTranslations);
};
