import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { RateLimitResult } from "./in-memory";

export { extractClientIp } from "./in-memory";

type PersistentCheckInput = {
  /** Namespace + identite, ex: "seller-otp:ip:1.2.3.4" */
  key: string;
  /** Nombre maximal d'appels dans la fenetre. */
  limit: number;
  /** Duree de la fenetre en secondes. */
  windowSeconds: number;
};

/**
 * Rate limit a fenetre fixe, partage entre toutes les instances serverless
 * (compteur en base via la RPC atomique rate_limit_hit).
 *
 * Fail-open : si la base ou la migration est indisponible, on laisse passer
 * plutot que de bloquer des parcours legitimes en production.
 */
export const checkPersistentRateLimit = async ({
  key,
  limit,
  windowSeconds,
}: PersistentCheckInput): Promise<RateLimitResult> => {
  try {
    const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });

    const row = data?.[0];
    if (error || !row) {
      console.error("[rate-limit] check failed:", error?.message ?? "no row returned");
      return { ok: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
    }

    const resetAt = new Date(row.reset_at).getTime();
    if (!row.allowed) {
      return { ok: false, remaining: 0, resetAt };
    }
    return { ok: true, remaining: row.remaining, resetAt };
  } catch (error) {
    console.error(
      "[rate-limit] unexpected failure:",
      error instanceof Error ? error.message : error
    );
    return { ok: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
  }
};

export const rateLimitResponseBody = {
  ok: false as const,
  code: "rate_limited" as const,
  message: "Trop de tentatives. Merci de reessayer dans quelques minutes.",
};
