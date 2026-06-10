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

type RateLimitHitRow = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

// La RPC rate_limit_hit (migration 20260610_024) n'est pas encore dans les
// types generes ; cast local en attendant la regeneration de types/db/supabase.ts.
type RateLimitRpcClient = {
  rpc: (
    fn: "rate_limit_hit",
    args: { p_key: string; p_limit: number; p_window_seconds: number }
  ) => PromiseLike<{ data: RateLimitHitRow[] | null; error: { message: string } | null }>;
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
    const client = supabaseAdmin as unknown as RateLimitRpcClient;
    const { data, error } = await client.rpc("rate_limit_hit", {
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
