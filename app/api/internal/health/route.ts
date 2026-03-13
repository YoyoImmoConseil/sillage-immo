import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db/supabase";
import { isInternalRequest } from "@/lib/admin/auth";

type HealthStatus = "ok" | "degraded";

const CORE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_API_KEY",
  "DOMAIN_EVENTS_CRON_SECRET",
] as const;

const OPTIONAL_ENV_KEYS = [
  "OPENAI_API_KEY",
  "LOUPE_API_BASE_URL",
  "LOUPE_API_EMAIL",
  "LOUPE_API_PASSWORD",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM_EMAIL",
  "SMTP_FROM_NAME",
] as const;

const hasValue = (value: string | undefined) => {
  return Boolean(value && value.trim().length > 0);
};

const getMissingEnv = (keys: readonly string[]) => {
  return keys.filter((key) => !hasValue(process.env[key]));
};

const createSupabaseHealthClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasValue(url) || !hasValue(serviceRoleKey)) return null;
  return createClient<Database>(url as string, serviceRoleKey as string, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const missingCoreEnv = getMissingEnv(CORE_ENV_KEYS);
  const missingOptionalEnv = getMissingEnv(OPTIONAL_ENV_KEYS);
  const supabase = createSupabaseHealthClient();
  const startedAt = Date.now();
  const scopeParam = new URL(request.url).searchParams.get("scope");
  const scope = scopeParam === "core" ? "core" : "full";

  let supabaseOk = false;
  let supabaseError: string | null = null;
  let domainEventsQueue: { pending: number; processed: number; failed: number } | null = null;

  if (!supabase) {
    supabaseError =
      "Supabase health client unavailable (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).";
  } else {
    const { error: supabasePingError } = await supabase
      .from("seller_leads")
      .select("id", { head: true, count: "exact" });

    if (supabasePingError) {
      supabaseError = supabasePingError.message;
    } else {
      supabaseOk = true;
      const countByStatus = async (status: "pending" | "processed" | "failed") => {
        const { count, error } = await supabase
          .from("domain_events")
          .select("id", { count: "exact", head: true })
          .eq("status", status);
        if (error) throw new Error(error.message);
        return count ?? 0;
      };

      try {
        const [pending, processed, failed] = await Promise.all([
          countByStatus("pending"),
          countByStatus("processed"),
          countByStatus("failed"),
        ]);
        domainEventsQueue = { pending, processed, failed };
      } catch (error) {
        supabaseError =
          error instanceof Error
            ? `Queue check failed: ${error.message}`
            : "Queue check failed.";
      }
    }
  }

  const queueHealthy = domainEventsQueue ? domainEventsQueue.failed === 0 : false;
  const envHealthyForStatus =
    scope === "core"
      ? missingCoreEnv.length === 0
      : missingCoreEnv.length === 0 && missingOptionalEnv.length === 0;
  const status: HealthStatus =
    envHealthyForStatus && supabaseOk && queueHealthy ? "ok" : "degraded";

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    scope,
    checks: {
      env: {
        ok: envHealthyForStatus,
        missingCoreEnv,
        missingOptionalEnv,
      },
      supabase: {
        ok: supabaseOk,
        latencyMs: Date.now() - startedAt,
        error: supabaseError,
      },
      domainEventsQueue: domainEventsQueue
        ? {
            ok: queueHealthy,
            ...domainEventsQueue,
          }
        : {
            ok: false,
            pending: null,
            processed: null,
            failed: null,
          },
    },
  });
};
