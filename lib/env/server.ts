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
} as const;
