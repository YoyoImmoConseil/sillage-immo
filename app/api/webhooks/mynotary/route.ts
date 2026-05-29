import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env/server";
import { emitDomainEvent } from "@/lib/events/domain-events";
import type {
  MyNotaryEventType,
  MyNotarySignatureCompletedPayload,
  MyNotaryWebhookEnvelope,
} from "@/lib/mynotary/types";
import {
  processSignatureCompleted,
  softDeleteByContractOrOperation,
} from "@/services/mynotary/signature-completed.service";
import { getContract } from "@/lib/mynotary/client";

type EventsWriter = {
  from: (table: "mynotary_events") => {
    insert: (row: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: ({ message: string; code?: string }) | null;
        }>;
      };
    };
    update: (row: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Inbound MyNotary webhook entry point. The handler is intentionally
// thin: it (1) authenticates the call, (2) logs the raw payload in
// `mynotary_events` with a UNIQUE constraint on event_id (idempotence),
// (3) dispatches to the matching service, and (4) always returns 200
// when the auth + idempotence step succeeded, so MyNotary does not
// keep retrying for an application-level error we already captured.

const SUPPORTED_EVENTS = new Set<MyNotaryEventType>([
  "signature_completed",
  "signature_cancel",
  "operation_deleted",
]);

const safeEqual = (a: string, b: string) => {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

// Temporary debug helper: when a webhook is rejected, log a
// fingerprint of what MyNotary actually sent so we can diagnose
// header / value mismatches without exposing the secret in logs.
// To be removed once the integration is confirmed stable.
const logAuthFailure = (request: Request, headerName: string): void => {
  try {
    const candidateHeaderNames = [
      headerName,
      "x-mynotary-secret",
      "x-mynotary-signature",
      "x-mynotary-token",
      "x-mynotary-auth",
      "x-api-key",
      "x-webhook-secret",
      "authorization",
    ];
    const fingerprint: Record<string, string> = {};
    for (const name of candidateHeaderNames) {
      const v = request.headers.get(name);
      if (v && typeof v === "string") {
        const trimmed = v.trim();
        const masked =
          trimmed.length <= 8
            ? "***"
            : `${trimmed.slice(0, 4)}…${trimmed.slice(-4)} (len=${trimmed.length})`;
        fingerprint[name] = masked;
      }
    }
    const allReceivedHeaderNames: string[] = [];
    request.headers.forEach((_value, key) => {
      allReceivedHeaderNames.push(key);
    });
    const userAgent = request.headers.get("user-agent") ?? "(no-ua)";
    console.warn(
      "[mynotary-webhook] auth failed",
      JSON.stringify({
        expected_header: headerName,
        expected_value_length:
          (serverEnv.MYNOTARY_WEBHOOK_AUTH_VALUE || "").length,
        user_agent: userAgent,
        all_received_headers: allReceivedHeaderNames.sort(),
        candidates_fingerprint: fingerprint,
      })
    );
  } catch {
    // diagnostics are best-effort
  }
};

const authorize = (request: Request): boolean => {
  const headerName = (serverEnv.MYNOTARY_WEBHOOK_AUTH_HEADER || "x-mynotary-secret")
    .toLowerCase();
  const expected = serverEnv.MYNOTARY_WEBHOOK_AUTH_VALUE || "";
  if (!expected) {
    logAuthFailure(request, headerName);
    return false;
  }
  const received = request.headers.get(headerName) ?? "";
  const ok = safeEqual(received, expected);
  if (!ok) logAuthFailure(request, headerName);
  return ok;
};

const parseEnvelope = async (
  request: Request
): Promise<{ envelope: MyNotaryWebhookEnvelope | null; eventId: string }> => {
  let envelope: MyNotaryWebhookEnvelope | null = null;
  try {
    envelope = (await request.json()) as MyNotaryWebhookEnvelope;
  } catch {
    envelope = null;
  }
  const fromBody =
    envelope && typeof envelope.eventId === "string" ? envelope.eventId : "";
  const fromHeader =
    request.headers.get("x-mynotary-event-id") ??
    request.headers.get("x-event-id") ??
    "";
  const eventId =
    fromBody.length > 0
      ? fromBody
      : fromHeader.length > 0
        ? fromHeader
        : `mn:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  return { envelope, eventId };
};

const markProcessed = async (
  eventDbId: string,
  error?: string | null
) => {
  const writer = supabaseAdmin as unknown as EventsWriter;
  await writer
    .from("mynotary_events")
    .update({
      processed_at: new Date().toISOString(),
      error: error ?? null,
    })
    .eq("id", eventDbId);
};

export const POST = async (request: Request) => {
  if (!authorize(request)) {
    return NextResponse.json(
      { ok: false, code: "unauthorized" },
      { status: 401 }
    );
  }

  const { envelope, eventId } = await parseEnvelope(request);
  if (!envelope || typeof envelope.event !== "string") {
    return NextResponse.json(
      { ok: false, code: "invalid_payload" },
      { status: 400 }
    );
  }

  // Idempotent insert via UNIQUE(event_id). If MyNotary replays the
  // same event, we get a 23505 conflict and return 200 OK without
  // re-processing.
  const writer = supabaseAdmin as unknown as EventsWriter;
  const { data: eventRow, error: insertError } = await writer
    .from("mynotary_events")
    .insert({
      event_id: eventId,
      event_type: envelope.event,
      raw_payload: envelope as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, replayed: true });
    }
    return NextResponse.json(
      { ok: false, code: "event_log_failed", message: insertError.message },
      { status: 500 }
    );
  }
  if (!eventRow) {
    return NextResponse.json(
      { ok: false, code: "event_log_failed" },
      { status: 500 }
    );
  }
  const eventDbId = eventRow.id;

  if (!SUPPORTED_EVENTS.has(envelope.event)) {
    await markProcessed(eventDbId, "event_type_ignored");
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    if (envelope.event === "signature_completed") {
      const payload = envelope.data as MyNotarySignatureCompletedPayload;
      if (!payload || typeof payload.contractId === "undefined") {
        await markProcessed(eventDbId, "missing_contract_id");
        return NextResponse.json({ ok: true, ignored: true });
      }
      // The signature_completed payload does NOT carry the contract
      // `model` (its template id) — only contractId / operationId /
      // files / signatureTime. We fetch the contract to classify it
      // (mandate / offre / compromis / location…) before ingesting.
      // Best-effort: if the fetch fails, we still ingest with whatever
      // contractType the payload happened to carry (-> classified as
      // "other") rather than dropping the event.
      if (!payload.contractType) {
        try {
          const contract = await getContract(String(payload.contractId));
          if (contract?.model) payload.contractType = contract.model;
          if (!payload.operationType && contract?.label) {
            payload.operationType = contract.label;
          }
        } catch {
          // non-blocking enrichment
        }
      }
      const result = await processSignatureCompleted({
        payload,
        source: "webhook",
      });
      await markProcessed(eventDbId, null);
      return NextResponse.json({
        ok: true,
        skipped: result.skipped,
        contractKind: result.contractKind,
        matched: result.matched,
        confidence: result.confidence,
      });
    }

    if (envelope.event === "signature_cancel") {
      const payload = envelope.data as { contractId?: number | string };
      if (!payload?.contractId) {
        await markProcessed(eventDbId, "missing_contract_id");
        return NextResponse.json({ ok: true, ignored: true });
      }
      const { softDeleted } = await softDeleteByContractOrOperation({
        mynotaryContractId: String(payload.contractId),
      });
      if (softDeleted > 0) {
        await emitDomainEvent({
          aggregateType: "mynotary_document",
          aggregateId: String(payload.contractId),
          eventName: "mynotary.document_soft_deleted",
          payload: { reason: "signature_cancel", softDeleted },
        });
      }
      await markProcessed(eventDbId, null);
      return NextResponse.json({ ok: true, softDeleted });
    }

    if (envelope.event === "operation_deleted") {
      const payload = envelope.data as { operationId?: number | string };
      if (!payload?.operationId) {
        await markProcessed(eventDbId, "missing_operation_id");
        return NextResponse.json({ ok: true, ignored: true });
      }
      const { softDeleted } = await softDeleteByContractOrOperation({
        mynotaryOperationId: String(payload.operationId),
      });
      if (softDeleted > 0) {
        await emitDomainEvent({
          aggregateType: "mynotary_document",
          aggregateId: String(payload.operationId),
          eventName: "mynotary.document_soft_deleted",
          payload: { reason: "operation_deleted", softDeleted },
        });
      }
      await markProcessed(eventDbId, null);
      return NextResponse.json({ ok: true, softDeleted });
    }

    await markProcessed(eventDbId, null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "processing_failed";
    await markProcessed(eventDbId, message);
    return NextResponse.json(
      { ok: false, code: "processing_failed", message },
      { status: 500 }
    );
  }
};
