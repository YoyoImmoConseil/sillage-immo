import "server-only";
import { publicEnv } from "./public";

const requireServerEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing server env var: ${key}`);
  }
  return value;
};

export const serverEnv = {
  ...publicEnv,
  SUPABASE_SERVICE_ROLE_KEY: requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  ADMIN_API_KEY: requireServerEnv("ADMIN_API_KEY"),
  DOMAIN_EVENTS_CRON_SECRET: process.env.DOMAIN_EVENTS_CRON_SECRET ?? "",
  SWEEPBRIGHT_API_BASE_URL:
    process.env.SWEEPBRIGHT_API_BASE_URL ?? "https://website.sweepbright.com/api",
  SWEEPBRIGHT_API_VERSION: process.env.SWEEPBRIGHT_API_VERSION ?? "20241030",
  SWEEPBRIGHT_CLIENT_ID: process.env.SWEEPBRIGHT_CLIENT_ID ?? "",
  SWEEPBRIGHT_CLIENT_SECRET: process.env.SWEEPBRIGHT_CLIENT_SECRET ?? "",
  SWEEPBRIGHT_MEDIA_BUCKET: process.env.SWEEPBRIGHT_MEDIA_BUCKET ?? "property-media-cache",
  SWEEPBRIGHT_ZAPIER_WEBHOOK_SECRET: process.env.SWEEPBRIGHT_ZAPIER_WEBHOOK_SECRET ?? "",
  PUBLIC_SITE_URL: process.env.PUBLIC_SITE_URL ?? "",
  // 32+ random chars used by lib/ai/anonymous-session to sign the
  // sillage_ai_session cookie. Optional in dev (a fallback is used);
  // REQUIRED in production — anonymous-session.ts throws when missing.
  SILLAGE_AI_SESSION_SECRET: process.env.SILLAGE_AI_SESSION_SECRET ?? "",
  // MyNotary public-API integration (phase 1: inbound only).
  // API_KEY: application token (x-api-key header on every call).
  // ORGANIZATION_ID: returned by POST /clients via
  //   `npm run mynotary:link-organization` — stored once and reused.
  // WEBHOOK_AUTH_HEADER / WEBHOOK_AUTH_VALUE: secret pair used by
  //   /api/webhooks/mynotary to authenticate inbound webhook calls.
  MYNOTARY_API_KEY: process.env.MYNOTARY_API_KEY ?? "",
  // Defaults to production. Set this to the preprod URL
  // (`https://api-preprod.mynotary.fr/api/v1`) on Vercel preview to
  // hit the MyNotary staging environment with the preprod x-api-key.
  MYNOTARY_API_BASE_URL:
    process.env.MYNOTARY_API_BASE_URL ?? "https://api.mynotary.fr/api/v1",
  MYNOTARY_ORGANIZATION_ID: process.env.MYNOTARY_ORGANIZATION_ID ?? "",
  MYNOTARY_WEBHOOK_AUTH_HEADER:
    process.env.MYNOTARY_WEBHOOK_AUTH_HEADER ?? "x-mynotary-secret",
  MYNOTARY_WEBHOOK_AUTH_VALUE: process.env.MYNOTARY_WEBHOOK_AUTH_VALUE ?? "",
  // Supabase Storage bucket used to archive the signed PDFs that
  // MyNotary delivers via the `signature_completed` webhook
  // (`files[].url`). Lazily created by migration 038.
  MYNOTARY_ARCHIVE_BUCKET:
    process.env.MYNOTARY_ARCHIVE_BUCKET ?? "mynotary-archives",
} as const;
