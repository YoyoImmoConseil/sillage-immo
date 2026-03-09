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
} as const;
