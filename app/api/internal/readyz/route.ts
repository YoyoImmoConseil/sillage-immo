import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db/supabase";
import { isInternalRequest } from "@/lib/admin/auth";

const hasValue = (value: string | undefined) => {
  return Boolean(value && value.trim().length > 0);
};

const getCoreEnvMissing = () => {
  const keys = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ADMIN_API_KEY",
    "DOMAIN_EVENTS_CRON_SECRET",
  ] as const;
  return keys.filter((key) => !hasValue(process.env[key]));
};

type ReadyzFailureReason =
  | "missing_core_env"
  | "supabase_unreachable"
  | "domain_events_queue_check_failed"
  | "domain_events_failed_present";

const RUNBOOK_PATH = "/docs/ops/readyz-runbook";

const actionForReason = (reason: ReadyzFailureReason) => {
  switch (reason) {
    case "missing_core_env":
      return [
        "Verifier les variables d'environnement critiques sur Vercel (Production).",
        "Redepoyer le projet apres correction des variables.",
      ];
    case "supabase_unreachable":
      return [
        "Verifier le statut Supabase et la validite des cles de service role.",
        "Tester une requete simple Supabase depuis /api/internal/health.",
      ];
    case "domain_events_queue_check_failed":
      return [
        "Verifier l'accessibilite de la table domain_events et les permissions SQL.",
        "Verifier les logs Vercel des routes /api/internal/cron/domain-events.",
      ];
    case "domain_events_failed_present":
      return [
        "Consulter les events failed dans domain_events (last_error, attempts).",
        "Corriger la cause puis relancer /api/admin/domain-events/process.",
      ];
    default:
      return ["Consulter le runbook technique et les logs applicatifs."];
  }
};

const buildNotReadyResponse = (input: {
  reason: ReadyzFailureReason;
  details?: Record<string, unknown>;
}) => {
  return NextResponse.json(
    {
      status: "not_ready",
      reason: input.reason,
      ...input.details,
      alert: {
        severity: "high",
        runbook: RUNBOOK_PATH,
        recommendedActions: actionForReason(input.reason),
      },
    },
    { status: 503 }
  );
};

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const missing = getCoreEnvMissing();
  if (missing.length > 0) {
    return buildNotReadyResponse({
      reason: "missing_core_env",
      details: { missing },
    });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { error: supabasePingError } = await supabase
    .from("seller_leads")
    .select("id", { head: true, count: "exact" });

  if (supabasePingError) {
    return buildNotReadyResponse({
      reason: "supabase_unreachable",
      details: { error: supabasePingError.message },
    });
  }

  const { count: failedCount, error: queueError } = await supabase
    .from("domain_events")
    .select("id", { head: true, count: "exact" })
    .eq("status", "failed");

  if (queueError) {
    return buildNotReadyResponse({
      reason: "domain_events_queue_check_failed",
      details: { error: queueError.message },
    });
  }

  if ((failedCount ?? 0) > 0) {
    return buildNotReadyResponse({
      reason: "domain_events_failed_present",
      details: { failed: failedCount ?? 0 },
    });
  }

  return NextResponse.json(
    {
      status: "ready",
      timestamp: new Date().toISOString(),
      alert: {
        severity: "none",
        runbook: RUNBOOK_PATH,
      },
    },
    { status: 200 }
  );
};
